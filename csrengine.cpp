#include "csrengine.h"
#include <openssl/evp.h>
#include <openssl/x509.h>
#include <openssl/pem.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <openssl/err.h>
#include <openssl/obj_mac.h>
#include <QByteArray>

namespace {
QString getOpenSSLError() {
    char buf[256];
    unsigned long err = ERR_get_error();
    if (err == 0) return "Lỗi không xác định từ OpenSSL";
    ERR_error_string_n(err, buf, sizeof(buf));
    return QString::fromUtf8(buf);
}
}

QString CsrEngine::keyTypeName(KeyType type) {
    switch (type) {
    case KeyType::Rsa2048: return "RSA 2048-bit (Tiêu chuẩn)";
    case KeyType::Rsa4096: return "RSA 4096-bit (Bảo mật cao)";
    case KeyType::EccPrime256v1: return "ECC NIST P-256 (prime256v1)";
    case KeyType::EccSecp384r1: return "ECC NIST P-384 (secp384r1)";
    }
    return "RSA 2048-bit";
}

QString CsrEngine::digestName(DigestType digest) {
    switch (digest) {
    case DigestType::Sha256: return "SHA-256";
    case DigestType::Sha384: return "SHA-384";
    case DigestType::Sha512: return "SHA-512";
    }
    return "SHA-256";
}

CsrEngine::Result CsrEngine::generate(const SubjectInfo &subject, KeyType keyType, DigestType digest) {
    Result res;

    if (subject.commonName.trimmed().isEmpty()) {
        res.error = "Common Name (CN) không được để trống (ví dụ: example.com hoặc Họ Tên).";
        return res;
    }

    EVP_PKEY *pkey = nullptr;
    if (keyType == KeyType::Rsa2048 || keyType == KeyType::Rsa4096) {
        int bits = (keyType == KeyType::Rsa4096) ? 4096 : 2048;
        EVP_PKEY_CTX *pctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, nullptr);
        if (!pctx) {
            res.error = "Không thể khởi tạo ngữ cảnh tạo khóa RSA: " + getOpenSSLError();
            return res;
        }
        if (EVP_PKEY_keygen_init(pctx) <= 0 ||
            EVP_PKEY_CTX_set_rsa_keygen_bits(pctx, bits) <= 0 ||
            EVP_PKEY_keygen(pctx, &pkey) <= 0) {
            EVP_PKEY_CTX_free(pctx);
            res.error = "Không thể sinh cặp khóa RSA: " + getOpenSSLError();
            return res;
        }
        EVP_PKEY_CTX_free(pctx);
    } else {
        int nid = (keyType == KeyType::EccSecp384r1) ? NID_secp384r1 : NID_X9_62_prime256v1;
        EVP_PKEY_CTX *pctx = EVP_PKEY_CTX_new_id(EVP_PKEY_EC, nullptr);
        if (!pctx) {
            res.error = "Không thể khởi tạo ngữ cảnh tạo khóa ECC: " + getOpenSSLError();
            return res;
        }
        if (EVP_PKEY_keygen_init(pctx) <= 0 ||
            EVP_PKEY_CTX_set_ec_paramgen_curve_nid(pctx, nid) <= 0 ||
            EVP_PKEY_keygen(pctx, &pkey) <= 0) {
            EVP_PKEY_CTX_free(pctx);
            res.error = "Không thể sinh cặp khóa ECC: " + getOpenSSLError();
            return res;
        }
        EVP_PKEY_CTX_free(pctx);
    }

    X509_REQ *req = X509_REQ_new();
    if (!req) {
        EVP_PKEY_free(pkey);
        res.error = "Không thể khởi tạo cấu trúc X509_REQ: " + getOpenSSLError();
        return res;
    }

    X509_REQ_set_version(req, 0); // Version 1 (0-indexed)
    X509_NAME *name = X509_NAME_new();

    auto addEntry = [&](const char *field, const QString &val) {
        if (!val.trimmed().isEmpty()) {
            QByteArray utf = val.trimmed().toUtf8();
            X509_NAME_add_entry_by_txt(name, field, MBSTRING_UTF8,
                                       reinterpret_cast<const unsigned char*>(utf.constData()),
                                       utf.size(), -1, 0);
        }
    };

    addEntry("C", subject.country);
    addEntry("ST", subject.state);
    addEntry("L", subject.locality);
    addEntry("O", subject.organization);
    addEntry("OU", subject.organizationalUnit);
    addEntry("CN", subject.commonName);
    addEntry("emailAddress", subject.email);

    X509_REQ_set_subject_name(req, name);
    X509_NAME_free(name);

    if (X509_REQ_set_pubkey(req, pkey) <= 0) {
        X509_REQ_free(req);
        EVP_PKEY_free(pkey);
        res.error = "Không thể gán khóa công khai vào CSR: " + getOpenSSLError();
        return res;
    }

    const EVP_MD *md = EVP_sha256();
    if (digest == DigestType::Sha384) md = EVP_sha384();
    else if (digest == DigestType::Sha512) md = EVP_sha512();

    if (X509_REQ_sign(req, pkey, md) <= 0) {
        X509_REQ_free(req);
        EVP_PKEY_free(pkey);
        res.error = "Ký số CSR thất bại: " + getOpenSSLError();
        return res;
    }

    // Export Private Key to PEM
    BIO *bioKey = BIO_new(BIO_s_mem());
    PEM_write_bio_PrivateKey(bioKey, pkey, nullptr, nullptr, 0, nullptr, nullptr);
    BUF_MEM *bptrKey = nullptr;
    BIO_get_mem_ptr(bioKey, &bptrKey);
    res.privateKeyPem = QString::fromUtf8(bptrKey->data, int(bptrKey->length));
    BIO_free(bioKey);

    // Export CSR to PEM
    BIO *bioReq = BIO_new(BIO_s_mem());
    PEM_write_bio_X509_REQ(bioReq, req);
    BUF_MEM *bptrReq = nullptr;
    BIO_get_mem_ptr(bioReq, &bptrReq);
    res.csrPem = QString::fromUtf8(bptrReq->data, int(bptrReq->length));
    BIO_free(bioReq);

    // Export Text Details (ASN.1 Structure preview)
    BIO *bioTxt = BIO_new(BIO_s_mem());
    X509_REQ_print_ex(bioTxt, req, XN_FLAG_COMPAT, X509_FLAG_COMPAT);
    BUF_MEM *bptrTxt = nullptr;
    BIO_get_mem_ptr(bioTxt, &bptrTxt);
    res.textDetails = QString::fromUtf8(bptrTxt->data, int(bptrTxt->length));
    BIO_free(bioTxt);

    X509_REQ_free(req);
    EVP_PKEY_free(pkey);

    res.success = true;
    return res;
}

QString CsrEngine::generateCliCommand(const SubjectInfo &subject, KeyType keyType, DigestType digest) {
    QString subj;
    if (!subject.country.trimmed().isEmpty()) subj += "/C=" + subject.country.trimmed();
    if (!subject.state.trimmed().isEmpty()) subj += "/ST=" + subject.state.trimmed();
    if (!subject.locality.trimmed().isEmpty()) subj += "/L=" + subject.locality.trimmed();
    if (!subject.organization.trimmed().isEmpty()) subj += "/O=" + subject.organization.trimmed();
    if (!subject.organizationalUnit.trimmed().isEmpty()) subj += "/OU=" + subject.organizationalUnit.trimmed();
    if (!subject.commonName.trimmed().isEmpty()) subj += "/CN=" + subject.commonName.trimmed();
    else subj += "/CN=example.com";
    if (!subject.email.trimmed().isEmpty()) subj += "/emailAddress=" + subject.email.trimmed();

    QString keyArg;
    switch (keyType) {
    case KeyType::Rsa2048: keyArg = "-newkey rsa:2048"; break;
    case KeyType::Rsa4096: keyArg = "-newkey rsa:4096"; break;
    case KeyType::EccPrime256v1: keyArg = "-newkey ec -pkeyopt ec_paramgen_curve:prime256v1"; break;
    case KeyType::EccSecp384r1: keyArg = "-newkey ec -pkeyopt ec_paramgen_curve:secp384r1"; break;
    }

    QString mdArg = "-" + digestName(digest).toLower();

    return QString("openssl req -new %1 %2 -nodes -keyout private.key -out request.csr -subj \"%3\"")
        .arg(keyArg, mdArg, subj);
}
