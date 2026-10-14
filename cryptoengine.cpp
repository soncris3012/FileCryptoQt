#include "cryptoengine.h"

#include <QFile>
#include <QFileInfo>
#include <QSaveFile>
#include <QByteArray>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>
#include <stdexcept>
#include <memory>

namespace {
constexpr char Magic[] = "FCQ1";
constexpr int SaltSize = 16;
constexpr int IvSize = 16;
constexpr int TagSize = 16;
constexpr int HeaderSize = 4 + 1 + SaltSize + IvSize;
constexpr int Iterations = 200000;
constexpr qint64 ChunkSize = 1024 * 1024;

using Ctx = std::unique_ptr<EVP_CIPHER_CTX, decltype(&EVP_CIPHER_CTX_free)>;

void fail(const QString &message) { throw std::runtime_error(message.toStdString()); }

QByteArray randomBytes(int size) {
    QByteArray bytes(size, Qt::Uninitialized);
    if (RAND_bytes(reinterpret_cast<unsigned char *>(bytes.data()), size) != 1)
        fail("Không thể tạo dữ liệu ngẫu nhiên an toàn.");
    return bytes;
}

QByteArray deriveKey(const QString &password, const QByteArray &salt) {
    QByteArray key(32, Qt::Uninitialized);
    const QByteArray pass = password.toUtf8();
    if (PKCS5_PBKDF2_HMAC(pass.constData(), pass.size(),
            reinterpret_cast<const unsigned char *>(salt.constData()), salt.size(),
            Iterations, EVP_sha256(), key.size(),
            reinterpret_cast<unsigned char *>(key.data())) != 1)
        fail("Không thể tạo khóa từ mật khẩu.");
    return key;
}

const EVP_CIPHER *cipherFor(CryptoEngine::Algorithm algorithm) {
    switch (algorithm) {
    case CryptoEngine::Algorithm::Aes256Cbc: return EVP_aes_256_cbc();
    case CryptoEngine::Algorithm::Aes256Gcm: return EVP_aes_256_gcm();
    case CryptoEngine::Algorithm::ChaCha20Poly1305: return EVP_chacha20_poly1305();
    }
    return nullptr;
}

bool authenticated(CryptoEngine::Algorithm a) {
    return a != CryptoEngine::Algorithm::Aes256Cbc;
}

void writeChecked(QIODevice &file, const char *data, qint64 size) {
    if (size > 0 && file.write(data, size) != size) fail("Không thể ghi tệp đầu ra.");
}
}

QString CryptoEngine::algorithmName(Algorithm a) {
    switch (a) {
    case Algorithm::Aes256Cbc: return "AES-256-CBC";
    case Algorithm::Aes256Gcm: return "AES-256-GCM";
    case Algorithm::ChaCha20Poly1305: return "ChaCha20-Poly1305";
    }
    return "Không xác định";
}

QString CryptoEngine::suggestedEncryptedPath(const QString &input) { return input + ".fcq"; }

QString CryptoEngine::suggestedDecryptedPath(const QString &input) {
    QString base = input;
    if (base.endsWith(".fcq", Qt::CaseInsensitive)) base.chop(4);
    return base + ".decrypted";
}

void CryptoEngine::encryptFile(const QString &inputPath, const QString &outputPath,
        const QString &password, Algorithm algorithm, const Progress &progress) {
    QFile input(inputPath);
    if (!input.open(QIODevice::ReadOnly)) fail("Không thể mở tệp nguồn.");
    QSaveFile output(outputPath);
    if (!output.open(QIODevice::WriteOnly)) fail("Không thể tạo tệp đầu ra.");

    const QByteArray salt = randomBytes(SaltSize);
    QByteArray iv = randomBytes(IvSize);
    const QByteArray key = deriveKey(password, salt);
    QByteArray header(Magic, 4);
    header.append(static_cast<char>(algorithm));
    header.append(salt);
    header.append(iv);
    writeChecked(output, header.constData(), header.size());

    Ctx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
    if (!ctx) fail("Không đủ bộ nhớ để khởi tạo mã hóa.");
    const EVP_CIPHER *cipher = cipherFor(algorithm);
    const int usedIvSize = algorithm == Algorithm::Aes256Cbc ? 16 : 12;
    if (EVP_EncryptInit_ex(ctx.get(), cipher, nullptr,
            reinterpret_cast<const unsigned char *>(key.constData()),
            reinterpret_cast<const unsigned char *>(iv.constData())) != 1)
        fail("Không thể khởi tạo thuật toán mã hóa.");

    QByteArray in(ChunkSize, Qt::Uninitialized), out(ChunkSize + EVP_MAX_BLOCK_LENGTH, Qt::Uninitialized);
    qint64 done = 0;
    while (!input.atEnd()) {
        const qint64 count = input.read(in.data(), in.size());
        if (count < 0) fail("Lỗi khi đọc tệp nguồn.");
        int written = 0;
        if (EVP_EncryptUpdate(ctx.get(), reinterpret_cast<unsigned char *>(out.data()), &written,
                reinterpret_cast<const unsigned char *>(in.constData()), static_cast<int>(count)) != 1)
            fail("Mã hóa dữ liệu thất bại.");
        writeChecked(output, out.constData(), written);
        done += count;
        if (progress) progress(done, input.size());
    }
    int written = 0;
    if (EVP_EncryptFinal_ex(ctx.get(), reinterpret_cast<unsigned char *>(out.data()), &written) != 1)
        fail("Hoàn tất mã hóa thất bại.");
    writeChecked(output, out.constData(), written);
    if (authenticated(algorithm)) {
        QByteArray tag(TagSize, Qt::Uninitialized);
        if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_AEAD_GET_TAG, TagSize, tag.data()) != 1)
            fail("Không thể tạo thẻ xác thực.");
        writeChecked(output, tag.constData(), tag.size());
    }
    if (!output.commit()) fail("Không thể hoàn tất tệp đầu ra.");
    Q_UNUSED(usedIvSize);
}

CryptoEngine::Algorithm CryptoEngine::decryptFile(const QString &inputPath, const QString &outputPath,
        const QString &password, const Progress &progress) {
    QFile input(inputPath);
    if (!input.open(QIODevice::ReadOnly)) fail("Không thể mở tệp mã hóa.");
    const QByteArray header = input.read(HeaderSize);
    if (header.size() != HeaderSize || QByteArray(header.constData(), 4) != QByteArray(Magic, 4))
        fail("Tệp không đúng định dạng FileCryptoQt.");
    const auto algorithm = static_cast<Algorithm>(static_cast<quint8>(header[4]));
    if (!cipherFor(algorithm)) fail("Thuật toán trong tệp không được hỗ trợ.");
    const QByteArray salt = header.mid(5, SaltSize);
    const QByteArray iv = header.mid(5 + SaltSize, IvSize);
    const QByteArray key = deriveKey(password, salt);
    QByteArray tag;
    qint64 cipherEnd = input.size();
    if (authenticated(algorithm)) {
        if (input.size() < HeaderSize + TagSize) fail("Tệp mã hóa không đầy đủ.");
        input.seek(input.size() - TagSize);
        tag = input.read(TagSize);
        cipherEnd -= TagSize;
        input.seek(HeaderSize);
    }

    QSaveFile output(outputPath);
    if (!output.open(QIODevice::WriteOnly)) fail("Không thể tạo tệp đầu ra.");
    Ctx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
    if (!ctx) fail("Không đủ bộ nhớ để khởi tạo giải mã.");
    if (EVP_DecryptInit_ex(ctx.get(), cipherFor(algorithm), nullptr,
            reinterpret_cast<const unsigned char *>(key.constData()),
            reinterpret_cast<const unsigned char *>(iv.constData())) != 1)
        fail("Không thể khởi tạo thuật toán giải mã.");

    QByteArray in(ChunkSize, Qt::Uninitialized), out(ChunkSize + EVP_MAX_BLOCK_LENGTH, Qt::Uninitialized);
    qint64 done = 0;
    while (input.pos() < cipherEnd) {
        const qint64 wanted = qMin<qint64>(in.size(), cipherEnd - input.pos());
        const qint64 count = input.read(in.data(), wanted);
        if (count <= 0) fail("Lỗi khi đọc tệp mã hóa.");
        int written = 0;
        if (EVP_DecryptUpdate(ctx.get(), reinterpret_cast<unsigned char *>(out.data()), &written,
                reinterpret_cast<const unsigned char *>(in.constData()), static_cast<int>(count)) != 1)
            fail("Giải mã dữ liệu thất bại.");
        writeChecked(output, out.constData(), written);
        done += count;
        if (progress) progress(done, cipherEnd - HeaderSize);
    }
    if (authenticated(algorithm) &&
        EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_AEAD_SET_TAG, TagSize, tag.data()) != 1)
        fail("Không thể đọc thẻ xác thực.");
    int written = 0;
    if (EVP_DecryptFinal_ex(ctx.get(), reinterpret_cast<unsigned char *>(out.data()), &written) != 1)
        fail("Sai mật khẩu hoặc tệp đã bị thay đổi.");
    writeChecked(output, out.constData(), written);
    if (!output.commit()) fail("Không thể hoàn tất tệp đầu ra.");
    return algorithm;
}

