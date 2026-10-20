#include "cryptoengine.h"
#include <QByteArray>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QMimeDatabase>
#include <QSaveFile>
#include <QtEndian>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <memory>
#include <stdexcept>

namespace {
constexpr int SaltSize=16,TagSize=16,MacSize=32,Iterations=200000;constexpr qint64 ChunkSize=1024*1024;
using Ctx=std::unique_ptr<EVP_CIPHER_CTX,decltype(&EVP_CIPHER_CTX_free)>;
using MdCtx=std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)>;
using PKey=std::unique_ptr<EVP_PKEY,decltype(&EVP_PKEY_free)>;
void fail(const QString&m){throw std::runtime_error(m.toStdString());}
QByteArray randomBytes(int n){QByteArray b(n,Qt::Uninitialized);if(RAND_bytes((unsigned char*)b.data(),n)!=1)fail("Không thể tạo dữ liệu ngẫu nhiên an toàn.");return b;}
QByteArray derive(const QString&p,const QByteArray&s,int n){QByteArray k(n,Qt::Uninitialized),pass=p.toUtf8();if(PKCS5_PBKDF2_HMAC(pass.constData(),pass.size(),(const unsigned char*)s.constData(),s.size(),Iterations,EVP_sha256(),n,(unsigned char*)k.data())!=1)fail("Không thể dẫn xuất khóa.");return k;}
const EVP_CIPHER*cipherFor(CryptoEngine::Algorithm a){switch(a){case CryptoEngine::Algorithm::Aes256Cbc:return EVP_aes_256_cbc();case CryptoEngine::Algorithm::Aes256Gcm:return EVP_aes_256_gcm();case CryptoEngine::Algorithm::ChaCha20Poly1305:return EVP_chacha20_poly1305();}return nullptr;}
bool aead(CryptoEngine::Algorithm a){return a!=CryptoEngine::Algorithm::Aes256Cbc;}
void writeAll(QIODevice&o,const QByteArray&d){if(!d.isEmpty()&&o.write(d)!=d.size())fail("Không thể ghi tệp đầu ra.");}
void add16(QByteArray&b,int n){quint16 v=qToBigEndian<quint16>(quint16(n));b.append((const char*)&v,2);}
int get16(const QByteArray&b,int pos){if(pos+2>b.size())fail("Metadata tệp không hợp lệ.");return qFromBigEndian<quint16>((const uchar*)b.constData()+pos);}
struct Parsed{int version=0;CryptoEngine::Algorithm algorithm{};QByteArray salt,iv,header;QString name,mime;qint64 payloadStart=0,payloadEnd=0;int authSize=0;bool authenticated=false;};
Parsed parse(QFile&f){
    Parsed p;QByteArray magic=f.read(4);if(magic=="FCQ1"){
        QByteArray h=magic+f.read(33);if(h.size()!=37)fail("Tệp mã hóa không đầy đủ.");p.version=1;p.algorithm=CryptoEngine::Algorithm(quint8(h[4]));p.salt=h.mid(5,16);p.iv=h.mid(21,16);p.header=h;p.payloadStart=37;p.authSize=aead(p.algorithm)?16:0;p.authenticated=aead(p.algorithm);
    }else if(magic=="FCQ2"){
        QByteArray fixed=f.read(18);if(fixed.size()!=18)fail("Tệp mã hóa không đầy đủ.");p.version=2;p.algorithm=CryptoEngine::Algorithm(quint8(fixed[0]));p.salt=fixed.mid(1,16);int ivn=quint8(fixed[17]);if(ivn<12||ivn>16)fail("IV trong tệp không hợp lệ.");p.iv=f.read(ivn);QByteArray lens=f.read(2);if(lens.size()!=2)fail("Metadata tệp không hợp lệ.");int nn=get16(lens,0);QByteArray name=f.read(nn);QByteArray ml=f.read(2);if(ml.size()!=2)fail("Metadata tệp không hợp lệ.");int mn=get16(ml,0);QByteArray mime=f.read(mn);p.header=magic+fixed+p.iv+lens+name+ml+mime;p.name=QString::fromUtf8(name);p.mime=QString::fromUtf8(mime);p.payloadStart=p.header.size();p.authSize=aead(p.algorithm)?TagSize:MacSize;p.authenticated=true;
    }else fail("Tệp không đúng định dạng FileCryptoQt.");
    if(!cipherFor(p.algorithm))fail("Thuật toán trong tệp không được hỗ trợ.");p.payloadEnd=f.size()-p.authSize;if(p.payloadEnd<p.payloadStart)fail("Tệp mã hóa bị thiếu dữ liệu.");return p;
}
struct Hmac{
    PKey key{nullptr,EVP_PKEY_free};MdCtx ctx{nullptr,EVP_MD_CTX_free};
    explicit Hmac(const QByteArray&k):key(EVP_PKEY_new_raw_private_key(EVP_PKEY_HMAC,nullptr,(const unsigned char*)k.constData(),k.size()),EVP_PKEY_free),ctx(EVP_MD_CTX_new(),EVP_MD_CTX_free){if(!key||!ctx||EVP_DigestSignInit(ctx.get(),nullptr,EVP_sha256(),nullptr,key.get())!=1)fail("Không thể khởi tạo HMAC.");}
    void add(const QByteArray&d){if(EVP_DigestSignUpdate(ctx.get(),d.constData(),d.size())!=1)fail("Không thể tính HMAC.");}
    QByteArray finish(){size_t n=MacSize;QByteArray out(MacSize,Qt::Uninitialized);if(EVP_DigestSignFinal(ctx.get(),(unsigned char*)out.data(),&n)!=1)fail("Không thể hoàn tất HMAC.");out.resize(n);return out;}
};
}

QString CryptoEngine::algorithmName(Algorithm a){switch(a){case Algorithm::Aes256Cbc:return"AES-256-CBC + HMAC-SHA256";case Algorithm::Aes256Gcm:return"AES-256-GCM";case Algorithm::ChaCha20Poly1305:return"ChaCha20-Poly1305";}return"Không xác định";}
QString CryptoEngine::suggestedEncryptedPath(const QString&i){return i+".fcq";}
CryptoEngine::FileInfo CryptoEngine::inspectFile(const QString&i){QFile f(i);if(!f.open(QIODevice::ReadOnly))fail("Không thể mở tệp mã hóa.");Parsed p=parse(f);return{p.algorithm,p.name,p.mime,p.authenticated,p.version};}
QString CryptoEngine::suggestedDecryptedPath(const QString&i){try{auto info=inspectFile(i);if(!info.originalName.isEmpty())return QDir(QFileInfo(i).absolutePath()).filePath("restored_"+QFileInfo(info.originalName).fileName());}catch(...){ }QString b=i;if(b.endsWith(".fcq",Qt::CaseInsensitive))b.chop(4);return b+".decrypted";}

void CryptoEngine::encryptFile(const QString&inPath,const QString&outPath,const QString&password,Algorithm alg,const Progress&progress){
    QFile in(inPath);if(!in.open(QIODevice::ReadOnly))fail("Không thể mở tệp nguồn.");QSaveFile out(outPath);if(!out.open(QIODevice::WriteOnly))fail("Không thể tạo tệp đầu ra.");
    QByteArray salt=randomBytes(SaltSize),iv=randomBytes(aead(alg)?12:16),keys=derive(password,salt,aead(alg)?32:64);
    QByteArray name=QFileInfo(inPath).fileName().toUtf8(),mime=QMimeDatabase().mimeTypeForFile(inPath,QMimeDatabase::MatchContent).name().toUtf8();QByteArray header("FCQ2",4);header.append(char(alg));header+=salt;header.append(char(iv.size()));header+=iv;add16(header,name.size());header+=name;add16(header,mime.size());header+=mime;writeAll(out,header);
    Ctx ctx(EVP_CIPHER_CTX_new(),EVP_CIPHER_CTX_free);if(!ctx)fail("Không thể khởi tạo mã hóa.");const EVP_CIPHER*c=cipherFor(alg);if(EVP_EncryptInit_ex(ctx.get(),c,nullptr,nullptr,nullptr)!=1)fail("Không thể khởi tạo thuật toán.");if(aead(alg)&&EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_AEAD_SET_IVLEN,iv.size(),nullptr)!=1)fail("Không thể đặt IV.");if(EVP_EncryptInit_ex(ctx.get(),nullptr,nullptr,(const unsigned char*)keys.constData(),(const unsigned char*)iv.constData())!=1)fail("Không thể đặt khóa.");int n=0;if(aead(alg)&&EVP_EncryptUpdate(ctx.get(),nullptr,&n,(const unsigned char*)header.constData(),header.size())!=1)fail("Không thể xác thực metadata.");std::unique_ptr<Hmac> mac;if(!aead(alg)){mac=std::make_unique<Hmac>(keys.mid(32,32));mac->add(header);}
    QByteArray src(ChunkSize,Qt::Uninitialized),dst(ChunkSize+EVP_MAX_BLOCK_LENGTH,Qt::Uninitialized);qint64 done=0;while(!in.atEnd()){qint64 got=in.read(src.data(),src.size());if(got<0)fail("Lỗi đọc tệp nguồn.");if(EVP_EncryptUpdate(ctx.get(),(unsigned char*)dst.data(),&n,(const unsigned char*)src.constData(),int(got))!=1)fail("Mã hóa thất bại.");QByteArray chunk=dst.left(n);writeAll(out,chunk);if(mac)mac->add(chunk);done+=got;if(progress)progress(done,in.size());}if(EVP_EncryptFinal_ex(ctx.get(),(unsigned char*)dst.data(),&n)!=1)fail("Hoàn tất mã hóa thất bại.");QByteArray final=dst.left(n);writeAll(out,final);if(mac)mac->add(final);if(aead(alg)){QByteArray tag(TagSize,Qt::Uninitialized);if(EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_AEAD_GET_TAG,TagSize,tag.data())!=1)fail("Không thể tạo thẻ xác thực.");writeAll(out,tag);}else writeAll(out,mac->finish());if(!out.commit())fail("Không thể hoàn tất tệp đầu ra.");
}

CryptoEngine::Algorithm CryptoEngine::decryptFile(const QString&inPath,const QString&outPath,const QString&password,const Progress&progress){
    QFile in(inPath);if(!in.open(QIODevice::ReadOnly))fail("Không thể mở tệp mã hóa.");Parsed p=parse(in);QByteArray keys=derive(password,p.salt,(p.version==2&&!aead(p.algorithm))?64:32),auth;if(p.authSize){in.seek(p.payloadEnd);auth=in.read(p.authSize);}in.seek(p.payloadStart);
    QSaveFile out(outPath);if(!out.open(QIODevice::WriteOnly))fail("Không thể tạo tệp đầu ra.");Ctx ctx(EVP_CIPHER_CTX_new(),EVP_CIPHER_CTX_free);if(!ctx)fail("Không thể khởi tạo giải mã.");if(EVP_DecryptInit_ex(ctx.get(),cipherFor(p.algorithm),nullptr,nullptr,nullptr)!=1)fail("Không thể khởi tạo thuật toán.");if(aead(p.algorithm)&&EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_AEAD_SET_IVLEN,p.version==1?12:p.iv.size(),nullptr)!=1)fail("Không thể đặt IV.");if(EVP_DecryptInit_ex(ctx.get(),nullptr,nullptr,(const unsigned char*)keys.constData(),(const unsigned char*)p.iv.constData())!=1)fail("Không thể đặt khóa.");int n=0;if(p.version==2&&aead(p.algorithm)&&EVP_DecryptUpdate(ctx.get(),nullptr,&n,(const unsigned char*)p.header.constData(),p.header.size())!=1)fail("Không thể xác thực metadata.");std::unique_ptr<Hmac> mac;if(p.version==2&&!aead(p.algorithm)){mac=std::make_unique<Hmac>(keys.mid(32,32));mac->add(p.header);}
    QByteArray src(ChunkSize,Qt::Uninitialized),dst(ChunkSize+EVP_MAX_BLOCK_LENGTH,Qt::Uninitialized);qint64 done=0;while(in.pos()<p.payloadEnd){qint64 want=qMin<qint64>(src.size(),p.payloadEnd-in.pos()),got=in.read(src.data(),want);if(got<=0)fail("Lỗi đọc tệp mã hóa.");QByteArray chunk=src.left(got);if(mac)mac->add(chunk);if(EVP_DecryptUpdate(ctx.get(),(unsigned char*)dst.data(),&n,(const unsigned char*)chunk.constData(),chunk.size())!=1)fail("Giải mã thất bại.");writeAll(out,dst.left(n));done+=got;if(progress)progress(done,p.payloadEnd-p.payloadStart);}if(mac){QByteArray expected=mac->finish();if(auth.size()!=expected.size()||CRYPTO_memcmp(auth.constData(),expected.constData(),expected.size())!=0)fail("Sai mật khẩu hoặc tệp đã bị thay đổi.");}if(aead(p.algorithm)&&EVP_CIPHER_CTX_ctrl(ctx.get(),EVP_CTRL_AEAD_SET_TAG,TagSize,auth.data())!=1)fail("Không thể đọc thẻ xác thực.");if(EVP_DecryptFinal_ex(ctx.get(),(unsigned char*)dst.data(),&n)!=1)fail("Sai mật khẩu hoặc tệp đã bị thay đổi.");writeAll(out,dst.left(n));if(!out.commit())fail("Không thể hoàn tất tệp đầu ra.");return p.algorithm;
}

CryptoEngine::TextResult CryptoEngine::encryptText(const QString& plainText, const QString& password, Algorithm alg, bool useBase64) {
    Q_UNUSED(useBase64);
    TextResult r;
    if (password.isEmpty()) {
        r.error = "Vui lòng nhập mật khẩu mã hóa.";
        return r;
    }
    QByteArray plainBytes = plainText.toUtf8();
    if (plainBytes.isEmpty()) {
        r.error = "Văn bản đầu vào trống.";
        return r;
    }

    try {
        if (alg == Algorithm::Aes256Cbc) {
            QByteArray salt = randomBytes(8);
            QByteArray kiv(48, Qt::Uninitialized);
            QByteArray passBytes = password.toUtf8();
            if (PKCS5_PBKDF2_HMAC(passBytes.constData(), passBytes.size(),
                                  (const unsigned char*)salt.constData(), salt.size(),
                                  10000, EVP_sha256(), 48, (unsigned char*)kiv.data()) != 1) {
                fail("Dẫn xuất khóa PBKDF2 thất bại.");
            }
            const unsigned char* key = (const unsigned char*)kiv.constData();
            const unsigned char* iv = (const unsigned char*)kiv.constData() + 32;

            Ctx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
            if (!ctx || EVP_EncryptInit_ex(ctx.get(), EVP_aes_256_cbc(), nullptr, key, iv) != 1) {
                fail("Khởi tạo mã hóa AES-256-CBC thất bại.");
            }

            QByteArray cipher(plainBytes.size() + EVP_MAX_BLOCK_LENGTH, Qt::Uninitialized);
            int outLen1 = 0, outLen2 = 0;
            if (EVP_EncryptUpdate(ctx.get(), (unsigned char*)cipher.data(), &outLen1,
                                  (const unsigned char*)plainBytes.constData(), plainBytes.size()) != 1) {
                fail("Mã hóa dữ liệu thất bại.");
            }
            if (EVP_EncryptFinal_ex(ctx.get(), (unsigned char*)cipher.data() + outLen1, &outLen2) != 1) {
                fail("Hoàn tất mã hóa (padding) thất bại.");
            }
            cipher.resize(outLen1 + outLen2);

            QByteArray container = QByteArray("Salted__", 8) + salt + cipher;
            r.rawCipher = container;
            r.hexString = QString::fromLatin1(container.toHex(' ').toUpper());
            r.base64String = QString::fromLatin1(container.toBase64());
            r.ok = true;
        } else {
            // AEAD Modes (GCM or ChaCha20-Poly1305)
            QByteArray salt = randomBytes(16);
            int ivLen = 12;
            QByteArray iv = randomBytes(ivLen);
            QByteArray key = derive(password, salt, 32);

            Ctx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
            const EVP_CIPHER* c = cipherFor(alg);
            if (!ctx || EVP_EncryptInit_ex(ctx.get(), c, nullptr, nullptr, nullptr) != 1) {
                fail("Khởi tạo thuật toán AEAD thất bại.");
            }
            if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_AEAD_SET_IVLEN, ivLen, nullptr) != 1) {
                fail("Đặt độ dài IV thất bại.");
            }
            if (EVP_EncryptInit_ex(ctx.get(), nullptr, nullptr, (const unsigned char*)key.constData(), (const unsigned char*)iv.constData()) != 1) {
                fail("Đặt khóa AEAD thất bại.");
            }

            QByteArray cipher(plainBytes.size() + EVP_MAX_BLOCK_LENGTH, Qt::Uninitialized);
            int outLen1 = 0, outLen2 = 0;
            if (EVP_EncryptUpdate(ctx.get(), (unsigned char*)cipher.data(), &outLen1,
                                  (const unsigned char*)plainBytes.constData(), plainBytes.size()) != 1) {
                fail("Mã hóa AEAD thất bại.");
            }
            if (EVP_EncryptFinal_ex(ctx.get(), (unsigned char*)cipher.data() + outLen1, &outLen2) != 1) {
                fail("Hoàn tất mã hóa AEAD thất bại.");
            }
            cipher.resize(outLen1 + outLen2);

            QByteArray tag(TagSize, Qt::Uninitialized);
            if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_AEAD_GET_TAG, TagSize, tag.data()) != 1) {
                fail("Tạo thẻ xác thực AEAD thất bại.");
            }

            QByteArray magic = (alg == Algorithm::Aes256Gcm) ? "FCQGCM" : "FCQCHA";
            QByteArray container = magic + salt + iv + tag + cipher;
            r.rawCipher = container;
            r.hexString = QString::fromLatin1(container.toHex(' ').toUpper());
            r.base64String = QString::fromLatin1(container.toBase64());
            r.ok = true;
        }
    } catch (const std::exception& e) {
        r.error = QString::fromStdString(e.what());
    }
    return r;
}

QString CryptoEngine::decryptText(const QString& cipherInput, const QString& password, Algorithm alg) {
    if (password.isEmpty()) fail("Vui lòng nhập mật khẩu giải mã.");
    QString trimmed = cipherInput.trimmed();
    if (trimmed.isEmpty()) fail("Dữ liệu bản mã trống.");

    QByteArray raw;
    QString noSpaces = trimmed;
    noSpaces.remove(' ');
    noSpaces.remove('\n');
    noSpaces.remove('\r');

    QByteArray b64Candidate = QByteArray::fromBase64(noSpaces.toLatin1());
    if (!b64Candidate.isEmpty() && (b64Candidate.startsWith("Salted__") || b64Candidate.startsWith("FCQ"))) {
        raw = b64Candidate;
    } else {
        QByteArray hexCandidate = QByteArray::fromHex(noSpaces.toLatin1());
        if (!hexCandidate.isEmpty()) raw = hexCandidate;
        else raw = b64Candidate;
    }

    if (raw.size() < 16) fail("Bản mã không đủ độ dài hợp lệ.");

    if (raw.startsWith("Salted__")) {
        if (raw.size() < 16) fail("Bản mã OpenSSL không hợp lệ.");
        QByteArray salt = raw.mid(8, 8);
        QByteArray cipher = raw.mid(16);

        int iterationsList[] = {10000, 200000};
        for (int iters : iterationsList) {
            try {
                QByteArray kiv(48, Qt::Uninitialized);
                QByteArray passBytes = password.toUtf8();
                if (PKCS5_PBKDF2_HMAC(passBytes.constData(), passBytes.size(),
                                      (const unsigned char*)salt.constData(), salt.size(),
                                      iters, EVP_sha256(), 48, (unsigned char*)kiv.data()) != 1) continue;

                const unsigned char* key = (const unsigned char*)kiv.constData();
                const unsigned char* iv = (const unsigned char*)kiv.constData() + 32;

                Ctx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
                if (!ctx || EVP_DecryptInit_ex(ctx.get(), EVP_aes_256_cbc(), nullptr, key, iv) != 1) continue;

                QByteArray plain(cipher.size() + EVP_MAX_BLOCK_LENGTH, Qt::Uninitialized);
                int outLen1 = 0, outLen2 = 0;
                if (EVP_DecryptUpdate(ctx.get(), (unsigned char*)plain.data(), &outLen1,
                                      (const unsigned char*)cipher.constData(), cipher.size()) != 1) continue;
                if (EVP_DecryptFinal_ex(ctx.get(), (unsigned char*)plain.data() + outLen1, &outLen2) != 1) continue;

                plain.resize(outLen1 + outLen2);
                return QString::fromUtf8(plain);
            } catch (...) {}
        }
        fail("Sai mật khẩu hoặc dữ liệu bản mã đã bị thay đổi.");
    } else if (raw.startsWith("FCQGCM") || raw.startsWith("FCQCHA")) {
        bool isGcm = raw.startsWith("FCQGCM");
        Algorithm usedAlg = isGcm ? Algorithm::Aes256Gcm : Algorithm::ChaCha20Poly1305;
        if (raw.size() < 6 + 16 + 12 + TagSize) fail("Bản mã AEAD bị thiếu dữ liệu.");

        QByteArray salt = raw.mid(6, 16);
        QByteArray iv = raw.mid(22, 12);
        QByteArray tag = raw.mid(34, TagSize);
        QByteArray cipher = raw.mid(34 + TagSize);

        QByteArray key = derive(password, salt, 32);

        Ctx ctx(EVP_CIPHER_CTX_new(), EVP_CIPHER_CTX_free);
        const EVP_CIPHER* c = cipherFor(usedAlg);
        if (!ctx || EVP_DecryptInit_ex(ctx.get(), c, nullptr, nullptr, nullptr) != 1) fail("Khởi tạo giải mã AEAD thất bại.");
        if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_AEAD_SET_IVLEN, 12, nullptr) != 1) fail("Đặt độ dài IV thất bại.");
        if (EVP_DecryptInit_ex(ctx.get(), nullptr, nullptr, (const unsigned char*)key.constData(), (const unsigned char*)iv.constData()) != 1) fail("Đặt khóa giải mã AEAD thất bại.");

        QByteArray plain(cipher.size() + EVP_MAX_BLOCK_LENGTH, Qt::Uninitialized);
        int outLen1 = 0, outLen2 = 0;
        if (EVP_DecryptUpdate(ctx.get(), (unsigned char*)plain.data(), &outLen1,
                              (const unsigned char*)cipher.constData(), cipher.size()) != 1) fail("Giải mã AEAD thất bại.");
        if (EVP_CIPHER_CTX_ctrl(ctx.get(), EVP_CTRL_AEAD_SET_TAG, TagSize, tag.data()) != 1) fail("Thẻ xác thực AEAD không khớp.");
        if (EVP_DecryptFinal_ex(ctx.get(), (unsigned char*)plain.data() + outLen1, &outLen2) != 1) fail("Sai mật khẩu hoặc bản mã đã bị sửa đổi.");

        plain.resize(outLen1 + outLen2);
        return QString::fromUtf8(plain);
    }

    Q_UNUSED(alg);
    fail("Định dạng bản mã không được nhận diện (cần tiền tố Salted__ hoặc FCQ).");
    return {};
}

QString CryptoEngine::generateCliCommand(bool decrypting, const QString& input, const QString& output,
                                        Algorithm algorithm, bool base64, bool isTextMode) {
    QString cipherFlag;
    switch (algorithm) {
    case Algorithm::Aes256Cbc: cipherFlag = "aes-256-cbc"; break;
    case Algorithm::Aes256Gcm: cipherFlag = "aes-256-gcm"; break;
    case Algorithm::ChaCha20Poly1305: cipherFlag = "chacha20-poly1305"; break;
    }

    if (isTextMode) {
        if (!decrypting) {
            QString snippet = input.isEmpty() ? "Noi dung mau" : input.left(25).replace("\"", "\\\"");
            return QString("echo -n \"%1\" | openssl enc -%2 -salt -pbkdf2%3 -pass pass:<password>")
                .arg(snippet, cipherFlag, base64 ? " -a" : "");
        } else {
            QString snippet = input.isEmpty() ? "U2FsdGVkX18..." : input.left(25).replace("\"", "\\\"");
            return QString("echo \"%1\" | openssl enc -d -%2 -pbkdf2%3 -pass pass:<password>")
                .arg(snippet, cipherFlag, base64 ? " -a" : "");
        }
    } else {
        QString inF = input.isEmpty() ? "taptin_goc.bin" : input;
        QString outF = output.isEmpty() ? (decrypting ? "taptin_giaima.bin" : "taptin_mahoa.enc") : output;
        if (!decrypting) {
            return QString("openssl enc -%1 -salt -pbkdf2%2 -in \"%3\" -out \"%4\" -pass pass:<password>")
                .arg(cipherFlag, base64 ? " -a" : "", inF, outF);
        } else {
            return QString("openssl enc -d -%1 -pbkdf2%2 -in \"%3\" -out \"%4\" -pass pass:<password>")
                .arg(cipherFlag, base64 ? " -a" : "", inF, outF);
        }
    }
}
