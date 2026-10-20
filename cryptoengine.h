#pragma once

#include <QString>
#include <functional>

class CryptoEngine {
public:
    enum class Algorithm : quint8 { Aes256Cbc = 1, Aes256Gcm = 2, ChaCha20Poly1305 = 3 };
    using Progress = std::function<void(qint64, qint64)>;
    struct FileInfo { Algorithm algorithm; QString originalName; QString mimeType; bool authenticated; int version; };

    struct TextResult {
        bool ok{false};
        QByteArray rawCipher;
        QString hexString;
        QString base64String;
        QString error;
    };

    static QString algorithmName(Algorithm algorithm);
    static void encryptFile(const QString &input, const QString &output, const QString &password,
                            Algorithm algorithm, const Progress &progress = {});
    static Algorithm decryptFile(const QString &input, const QString &output, const QString &password,
                                 const Progress &progress = {});
    static QString suggestedEncryptedPath(const QString &input);
    static QString suggestedDecryptedPath(const QString &input);
    static FileInfo inspectFile(const QString &input);

    static TextResult encryptText(const QString &plainText, const QString &password,
                                  Algorithm algorithm, bool useBase64 = true);
    static QString decryptText(const QString &cipherInput, const QString &password,
                               Algorithm algorithm);
    static QString generateCliCommand(bool decrypting, const QString &input, const QString &output,
                                      Algorithm algorithm, bool base64, bool isTextMode);
};

