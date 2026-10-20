#include <QCoreApplication>
#include <QDebug>
#include <QFile>
#include <iostream>
#include "cryptoengine.h"
#include "csrengine.h"

int main(int argc, char **argv) {
    QCoreApplication app(argc, argv);

    std::cout << "=== BẮT ĐẦU KIỂM THỬ CRYPTOLAB (EVP API & CSR) ===" << std::endl;

    // 1. Kiểm thử CsrEngine (Sinh cặp khóa RSA 2048 & Tạo CSR)
    CsrEngine::SubjectInfo subj;
    subj.commonName = "cryptolab.local";
    subj.organization = "CryptoLab Academy";
    subj.organizationalUnit = "Security Research";
    subj.country = "VN";
    subj.state = "Ha Noi";
    subj.locality = "Cau Giay";
    subj.email = "admin@cryptolab.local";

    auto csrRes = CsrEngine::generate(subj, CsrEngine::KeyType::Rsa2048, CsrEngine::DigestType::Sha256);
    if (!csrRes.success) {
        std::cerr << "[-] Thất bại sinh CSR: " << csrRes.error.toStdString() << std::endl;
        return 1;
    }
    std::cout << "[+] Sinh CSR thành công! Kích thước Private Key: " << csrRes.privateKeyPem.length()
              << " ký tự, Kích thước CSR: " << csrRes.csrPem.length() << " ký tự." << std::endl;

    QFile fCsr("/tmp/test_output.csr");
    if (fCsr.open(QIODevice::WriteOnly)) {
        fCsr.write(csrRes.csrPem.toUtf8());
        fCsr.close();
    }

    // 2. Kiểm thử CryptoEngine (Mã hóa văn bản AES-256-CBC)
    QString plainText = "Bảo mật thông tin 2026 - OpenSSL EVP C++!";
    QString pass = "MatKhauBaoMat123";

    auto encRes = CryptoEngine::encryptText(plainText, pass, CryptoEngine::Algorithm::Aes256Cbc, true);
    if (!encRes.ok) {
        std::cerr << "[-] Thất bại mã hóa: " << encRes.error.toStdString() << std::endl;
        return 2;
    }
    std::cout << "[+] Mã hóa AES-256-CBC thành công!" << std::endl;
    std::cout << "    - Hex: " << encRes.hexString.left(60).toStdString() << "..." << std::endl;
    std::cout << "    - Base64: " << encRes.base64String.toStdString() << std::endl;

    // 3. Giải mã và kiểm tra độ toàn vẹn
    QString decrypted = CryptoEngine::decryptText(encRes.base64String, pass, CryptoEngine::Algorithm::Aes256Cbc);
    if (decrypted != plainText) {
        std::cerr << "[-] Giải mã không khớp! Nhận được: " << decrypted.toStdString() << std::endl;
        return 3;
    }
    std::cout << "[+] Giải mã thành công và khớp 100% dữ liệu gốc: " << decrypted.toStdString() << std::endl;

    // 4. Kiểm thử CLI Command Generator
    QString cliEnc = CryptoEngine::generateCliCommand(false, plainText, "", CryptoEngine::Algorithm::Aes256Cbc, true, true);
    QString cliCsr = CsrEngine::generateCliCommand(subj, CsrEngine::KeyType::Rsa2048, CsrEngine::DigestType::Sha256);
    std::cout << "[+] Lệnh CLI mã hóa tương đương: " << cliEnc.toStdString() << std::endl;
    std::cout << "[+] Lệnh CLI CSR tương đương: " << cliCsr.toStdString() << std::endl;

    std::cout << "=== TẤT CẢ KIỂM THỬ ĐÃ VƯỢT QUA XUẤT SẮC! ===" << std::endl;
    return 0;
}
