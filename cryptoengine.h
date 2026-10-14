#pragma once

#include <QString>
#include <functional>

class CryptoEngine {
public:
    enum class Algorithm : quint8 { Aes256Cbc = 1, Aes256Gcm = 2, ChaCha20Poly1305 = 3 };
    using Progress = std::function<void(qint64, qint64)>;

    static QString algorithmName(Algorithm algorithm);
    static void encryptFile(const QString &input, const QString &output, const QString &password,
                            Algorithm algorithm, const Progress &progress = {});
    static Algorithm decryptFile(const QString &input, const QString &output, const QString &password,
                                 const Progress &progress = {});
    static QString suggestedEncryptedPath(const QString &input);
    static QString suggestedDecryptedPath(const QString &input);
};

