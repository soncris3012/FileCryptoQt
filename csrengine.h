#pragma once

#include <QString>

class CsrEngine {
public:
    enum class KeyType {
        Rsa2048,
        Rsa4096,
        EccPrime256v1,
        EccSecp384r1
    };

    enum class DigestType {
        Sha256,
        Sha384,
        Sha512
    };

    struct SubjectInfo {
        QString commonName;
        QString organization;
        QString organizationalUnit;
        QString country;
        QString state;
        QString locality;
        QString email;
    };

    struct Result {
        bool success{false};
        QString privateKeyPem;
        QString csrPem;
        QString textDetails;
        QString error;
    };

    static Result generate(const SubjectInfo &subject, KeyType keyType, DigestType digest = DigestType::Sha256);
    static QString generateCliCommand(const SubjectInfo &subject, KeyType keyType, DigestType digest = DigestType::Sha256);
    static QString keyTypeName(KeyType type);
    static QString digestName(DigestType digest);
};
