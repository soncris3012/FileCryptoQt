/**
 * Unit Test Suite for CryptoEngine Web
 * Kiểm tra mã hóa / giải mã roundtrip và bảo mật tính toàn vẹn
 */

const assert = require('assert');
const CryptoEngine = require('../js/crypto-engine.js');

async function runTests() {
    console.log("=== BẮT ĐẦU KIỂM THỬ CRYPTOENGINE WEB ===");

    const sampleText = "Xin chào! Đây là dữ liệu kiểm thử FileCryptoQt Web 2026. Tương thích C++ OpenSSL và Apple Swift CryptoKit.";
    const sampleData = new TextEncoder().encode(sampleText);
    const password = "SuperSecretPassword#2026";
    const fileName = "test_document.txt";
    const mimeType = "text/plain";

    for (const [algKey, algVal] of Object.entries(CryptoEngine.Algorithm)) {
        const algName = CryptoEngine.AlgorithmNames[algVal];
        console.log(`\n--- Kiểm tra thuật toán ${algVal}: ${algName} ---`);

        // 1. Mã hóa
        let encProgressCount = 0;
        const encrypted = await CryptoEngine.encryptFile(
            sampleData,
            fileName,
            mimeType,
            password,
            algVal,
            (p, msg) => { encProgressCount++; }
        );
        assert(encrypted instanceof Uint8Array, "Kết quả mã hóa phải là Uint8Array");
        assert(encrypted.length > sampleData.length, "Dữ liệu mã hóa phải lớn hơn dữ liệu gốc");
        console.log(`✓ Mã hóa thành công: ${encrypted.length} bytes (gốc ${sampleData.length} bytes)`);

        // 2. Kiểm tra Header
        const info = CryptoEngine.inspectFile(encrypted);
        assert.strictEqual(info.version, 2, "Phiên bản phải là 2 (FCQ2)");
        assert.strictEqual(info.algorithm, algVal, "Mã thuật toán phải khớp");
        assert.strictEqual(info.originalName, fileName, "Tên tệp gốc phải khớp");
        assert.strictEqual(info.mimeType, mimeType, "MIME type phải khớp");
        assert.strictEqual(info.authenticated, true, "Phải có xác thực toàn vẹn");
        console.log(`✓ Inspect header chính xác: ${info.originalName} (${info.mimeType}), Payload: ${info.payloadSize}B, Auth: ${info.authSize}B`);

        // 3. Giải mã đúng mật khẩu
        let decProgressCount = 0;
        const decResult = await CryptoEngine.decryptFile(
            encrypted,
            password,
            (p, msg) => { decProgressCount++; }
        );
        const restoredText = new TextDecoder('utf8').decode(decResult.plaintext);
        assert.strictEqual(restoredText, sampleText, "Nội dung giải mã phải trùng khớp 100%");
        assert.strictEqual(decResult.originalName, fileName, "Tên tệp khôi phục phải đúng");
        console.log(`✓ Giải mã thành công: "${restoredText.substring(0, 45)}..."`);

        // 4. Kiểm tra sai mật khẩu
        let failedWrongPass = false;
        try {
            await CryptoEngine.decryptFile(encrypted, "WrongPassword@123");
        } catch (e) {
            failedWrongPass = true;
            console.log(`✓ Từ chối sai mật khẩu thành công: ${e.message}`);
        }
        assert(failedWrongPass, "Phải ném lỗi khi giải mã bằng sai mật khẩu");

        // 5. Kiểm tra sửa đổi dữ liệu (Tampering detection)
        const tampered = new Uint8Array(encrypted);
        // Tamper one byte in the ciphertext
        const tamperIndex = info.headerLength + Math.floor(info.payloadSize / 2);
        tampered[tamperIndex] ^= 0x55;

        let failedTamper = false;
        try {
            await CryptoEngine.decryptFile(tampered, password);
        } catch (e) {
            failedTamper = true;
            console.log(`✓ Phát hiện dữ liệu bị sửa đổi thành công: ${e.message}`);
        }
        assert(failedTamper, "Phải ném lỗi khi dữ liệu bản mã bị can thiệp");
    }

    // --- KIỂM THỬ MÃ HÓA / GIẢI MÃ VĂN BẢN THUẦN (HEX & BASE64) ---
    console.log("\n--- Kiểm tra Mã hóa & Giải mã Văn bản thuần (Text Mode) ---");
    const textPlain = "Bảo mật thông tin 2026 - Kiểm thử OpenSSL Salted__ & CSR!";
    const textPass = "MatKhauLab2026";

    // 1. AES-256-CBC (OpenSSL CLI Salted__ + PBKDF2)
    const encCbc = await CryptoEngine.encryptText(textPlain, textPass, CryptoEngine.Algorithm.Aes256Cbc, true);
    assert(encCbc.ok, "Mã hóa văn bản CBC phải thành công");
    assert(encCbc.base64String.startsWith("U2FsdGVk"), "Bản mã Base64 OpenSSL phải bắt đầu bằng U2FsdGVk (Salted__)");
    assert(encCbc.hexString.startsWith("53 61 6C 74 65 64 5F 5F"), "Bản mã Hex phải bắt đầu bằng 53 61 6C 74 65 64 5F 5F (Salted__)");
    console.log(`✓ Mã hóa OpenSSL AES-256-CBC thành công! Base64: ${encCbc.base64String.substring(0, 32)}...`);

    // Giải mã từ Base64
    const decCbcB64 = await CryptoEngine.decryptText(encCbc.base64String, textPass);
    assert.strictEqual(decCbcB64, textPlain, "Giải mã từ chuỗi Base64 phải khớp văn bản gốc");
    console.log("✓ Giải mã từ chuỗi Base64 thành công khớp 100% dữ liệu gốc!");

    // Giải mã từ Hex
    const decCbcHex = await CryptoEngine.decryptText(encCbc.hexString, textPass);
    assert.strictEqual(decCbcHex, textPlain, "Giải mã từ chuỗi Hex phải khớp văn bản gốc");
    console.log("✓ Giải mã từ chuỗi Hex thành công khớp 100% dữ liệu gốc!");

    // 2. AES-256-GCM & ChaCha20-Poly1305 Text Mode
    for (const alg of [CryptoEngine.Algorithm.Aes256Gcm, CryptoEngine.Algorithm.ChaCha20Poly1305]) {
        const algName = CryptoEngine.AlgorithmNames[alg];
        const encText = await CryptoEngine.encryptText(textPlain, textPass, alg, true);
        assert(encText.ok, `Mã hóa văn bản ${algName} phải thành công`);
        const decText = await CryptoEngine.decryptText(encText.base64String, textPass);
        assert.strictEqual(decText, textPlain, `Giải mã văn bản ${algName} phải khớp`);
        console.log(`✓ Mã hóa & Giải mã văn bản ${algName} thành công!`);
    }

    // --- KIỂM THỬ CSRENGINE (RSA KEYPAIR & PKCS#10 CSR) ---
    console.log("\n--- Kiểm tra Sinh Cặp khóa RSA & Chứng chỉ CSR (PKCS#10) ---");
    const CsrEngine = require('../js/csr-engine.js');
    const csrRes = await CsrEngine.generate({
        commonName: "cryptolab.local",
        organization: "CryptoLab Security Academy",
        organizationalUnit: "Cyber Security Lab",
        country: "VN",
        state: "Ha Noi",
        locality: "Cau Giay",
        email: "security@cryptolab.local"
    }, 2048, "SHA-256");

    assert(csrRes.success, "Sinh CSR phải thành công");
    assert(csrRes.privateKeyPem.includes("BEGIN PRIVATE KEY"), "Private Key phải ở định dạng PEM PKCS#8");
    assert(csrRes.csrPem.includes("BEGIN CERTIFICATE REQUEST"), "CSR phải ở định dạng PEM PKCS#10");
    assert.strictEqual(csrRes.verified, true, "Chữ ký số tự ký (Self-Signature) của CSR phải được xác thực hợp lệ");
    console.log(`✓ Sinh cặp khóa RSA 2048-bit thành công! Private Key PEM: ${csrRes.privateKeyPem.length} ký tự`);
    console.log(`✓ Tạo chứng chỉ CSR X.509 thành công! CSR PEM: ${csrRes.csrPem.length} ký tự`);
    console.log(`✓ Chữ ký số tự ký (Self-Signature) được xác thực: HỢP LỆ 100%`);

    console.log("\n=======================================================");
    console.log(" TẤT CẢ CÁC TÍNH NĂNG WEB ĐÃ ĐỒNG BỘ & ĐẠT 100% TEST! ");
    console.log("=======================================================\n");
}

runTests().catch(err => {
    console.error("LỖI TEST:", err);
    process.exit(1);
});
