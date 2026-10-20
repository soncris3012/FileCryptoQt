/**
 * FileCrypto Web — CsrEngine (X.509 Certificate Signing Request & RSA Keypair Generator)
 * Chuẩn PKCS#10 (RFC 2986), PKCS#8 & X.509 v1 (0-indexed)
 * Tương thích 100% với OpenSSL EVP / X.509 C++ (Desktop FileCryptoQt)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CsrEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const isBrowser = typeof window !== 'undefined' && typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
    let nodeCrypto = null;
    let subtle = null;

    if (isBrowser) {
        subtle = window.crypto.subtle;
    } else {
        try {
            nodeCrypto = require('crypto');
            subtle = nodeCrypto.webcrypto ? nodeCrypto.webcrypto.subtle : null;
        } catch (e) { }
    }

    // Helper: DER Length Encoding (ASN.1)
    function encodeLength(len) {
        if (len < 128) {
            return new Uint8Array([len]);
        }
        const bytes = [];
        let temp = len;
        while (temp > 0) {
            bytes.unshift(temp & 0xff);
            temp >>= 8;
        }
        return new Uint8Array([0x80 | bytes.length, ...bytes]);
    }

    // Helper: Concatenate Uint8Arrays
    function concatArrays(...arrays) {
        let total = 0;
        for (let i = 0; i < arrays.length; i++) {
            total += arrays[i].length;
        }
        const res = new Uint8Array(total);
        let offset = 0;
        for (let i = 0; i < arrays.length; i++) {
            res.set(arrays[i], offset);
            offset += arrays[i].length;
        }
        return res;
    }

    // Helper: Wrap bytes in ASN.1 Tag
    function asn1Tag(tagByte, bytes) {
        const len = encodeLength(bytes.length);
        return concatArrays(new Uint8Array([tagByte]), len, bytes);
    }

    function asn1Seq(bytes) { return asn1Tag(0x30, bytes); }
    function asn1Set(bytes) { return asn1Tag(0x31, bytes); }
    function asn1BitString(bytes) {
        return asn1Tag(0x03, concatArrays(new Uint8Array([0x00]), bytes));
    }

    function strToUtf8(str) {
        return new TextEncoder().encode(str);
    }

    // Standard X.500 Attribute OIDs
    const OIDS = {
        C:     asn1Tag(0x06, new Uint8Array([0x55, 0x04, 0x06])), // 2.5.4.6 Country
        ST:    asn1Tag(0x06, new Uint8Array([0x55, 0x04, 0x08])), // 2.5.4.8 StateOrProvince
        L:     asn1Tag(0x06, new Uint8Array([0x55, 0x04, 0x07])), // 2.5.4.7 Locality
        O:     asn1Tag(0x06, new Uint8Array([0x55, 0x04, 0x0a])), // 2.5.4.10 Organization
        OU:    asn1Tag(0x06, new Uint8Array([0x55, 0x04, 0x0b])), // 2.5.4.11 OrganizationalUnit
        CN:    asn1Tag(0x06, new Uint8Array([0x55, 0x04, 0x03])), // 2.5.4.3 CommonName
        email: asn1Tag(0x06, new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x01])) // 1.2.840.113549.1.9.1 emailAddress
    };

    // Signature Algorithm Identifiers (with NULL parameters)
    const SIG_ALGS = {
        "SHA-256": new Uint8Array([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b, 0x05, 0x00]),
        "SHA-384": new Uint8Array([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0c, 0x05, 0x00]),
        "SHA-512": new Uint8Array([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0d, 0x05, 0x00])
    };

    function buildRdn(oidBytes, strVal, tagByte) {
        tagByte = tagByte || 0x0c; // default UTF8String (0x0c)
        const valTag = asn1Tag(tagByte, strToUtf8(strVal));
        const atav = asn1Seq(concatArrays(oidBytes, valTag));
        return asn1Set(atav);
    }

    function formatPem(header, derBytes) {
        let binary = '';
        const len = derBytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(derBytes[i]);
        }
        let b64 = '';
        if (typeof btoa !== 'undefined') {
            b64 = btoa(binary);
        } else {
            b64 = Buffer.from(derBytes).toString('base64');
        }
        const lines = b64.match(/.{1,64}/g) || [];
        return `-----BEGIN ${header}-----\n` + lines.join('\n') + `\n-----END ${header}-----\n`;
    }

    function bytesToHexDump(bytes, indent = '                ') {
        const hex = [];
        for (let i = 0; i < bytes.length; i++) {
            hex.push(bytes[i].toString(16).padStart(2, '0'));
        }
        const lines = [];
        for (let i = 0; i < hex.length; i += 16) {
            lines.push(indent + hex.slice(i, i + 16).join(':') + (i + 16 < hex.length ? ':' : ''));
        }
        return lines.join('\n');
    }

    async function computeSha256Fingerprint(bytes) {
        if (!subtle) return "";
        const hashBuf = await subtle.digest("SHA-256", bytes);
        const hashBytes = new Uint8Array(hashBuf);
        return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
    }

    /**
     * Sinh cặp khóa RSA và tạo chứng chỉ yêu cầu CSR (PKCS#10)
     * @param {Object} subject - { commonName, organization, organizationalUnit, country, state, locality, email }
     * @param {number|string} keySize - 2048, 3072, hoặc 4096 (mặc định 2048)
     * @param {string} digestName - "SHA-256", "SHA-384", "SHA-512" (mặc định "SHA-256")
     */
    async function generate(subject, keySize = 2048, digestName = "SHA-256") {
        if (!subtle) {
            return {
                success: false,
                error: "Môi trường không hỗ trợ Web Crypto API (crypto.subtle)."
            };
        }

        const cn = (subject && subject.commonName ? subject.commonName.trim() : "");
        if (!cn) {
            return {
                success: false,
                error: "Common Name (CN) không được để trống (ví dụ: example.com hoặc sinhvien.edu.vn)."
            };
        }

        const size = parseInt(keySize, 10) || 2048;
        const validDigests = ["SHA-256", "SHA-384", "SHA-512"];
        const hashAlg = validDigests.includes(digestName.toUpperCase()) ? digestName.toUpperCase() : "SHA-256";

        try {
            // 1. Sinh cặp khóa RSA
            const keyPair = await subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: size,
                    publicExponent: new Uint8Array([1, 0, 1]), // 65537
                    hash: { name: hashAlg }
                },
                true,
                ["sign", "verify"]
            );

            // 2. Xuất Public Key (SPKI) & Private Key (PKCS#8)
            const spkiDer = new Uint8Array(await subtle.exportKey("spki", keyPair.publicKey));
            const pkcs8Der = new Uint8Array(await subtle.exportKey("pkcs8", keyPair.privateKey));

            // 3. Xây dựng X.500 Subject RDNs
            const rdns = [];
            if (subject.country && subject.country.trim()) {
                rdns.push(buildRdn(OIDS.C, subject.country.trim().substring(0, 2).toUpperCase(), 0x13)); // PrintableString
            }
            if (subject.state && subject.state.trim()) {
                rdns.push(buildRdn(OIDS.ST, subject.state.trim(), 0x0c));
            }
            if (subject.locality && subject.locality.trim()) {
                rdns.push(buildRdn(OIDS.L, subject.locality.trim(), 0x0c));
            }
            if (subject.organization && subject.organization.trim()) {
                rdns.push(buildRdn(OIDS.O, subject.organization.trim(), 0x0c));
            }
            if (subject.organizationalUnit && subject.organizationalUnit.trim()) {
                rdns.push(buildRdn(OIDS.OU, subject.organizationalUnit.trim(), 0x0c));
            }
            rdns.push(buildRdn(OIDS.CN, cn, 0x0c));
            if (subject.email && subject.email.trim()) {
                rdns.push(buildRdn(OIDS.email, subject.email.trim(), 0x16)); // IA5String
            }

            const subjectSeq = asn1Seq(concatArrays(...rdns));

            // 4. CertificationRequestInfo ::= SEQUENCE { version(0), subject, spki, attributes [0] }
            const versionDer = new Uint8Array([0x02, 0x01, 0x00]); // Version 1 (0-indexed)
            const emptyAttributes = new Uint8Array([0xa0, 0x00]);  // [0] IMPLICIT Attributes
            const criDer = asn1Seq(concatArrays(versionDer, subjectSeq, spkiDer, emptyAttributes));

            // 5. Ký số CertificationRequestInfo bằng Private Key
            const signatureBuf = await subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, criDer);
            const signatureDer = new Uint8Array(signatureBuf);

            // 6. Xác thực chữ ký tự ký (Self-Signature Verification)
            const isValid = await subtle.verify("RSASSA-PKCS1-v1_5", keyPair.publicKey, signatureDer, criDer);

            // 7. Đóng gói CertificationRequest hoàn chỉnh
            const sigAlgDer = SIG_ALGS[hashAlg] || SIG_ALGS["SHA-256"];
            const csrDer = asn1Seq(concatArrays(criDer, sigAlgDer, asn1BitString(signatureDer)));

            // 8. Định dạng PEM
            const privateKeyPem = formatPem("PRIVATE KEY", pkcs8Der);
            const csrPem = formatPem("CERTIFICATE REQUEST", csrDer);

            // 9. Tính SHA-256 Fingerprint
            const fingerprint = await computeSha256Fingerprint(csrDer);

            // 10. Trích xuất Subject DN String cho bảng phân tích
            const subjectParts = [];
            if (subject.country && subject.country.trim()) subjectParts.push(`C=${subject.country.trim().toUpperCase()}`);
            if (subject.state && subject.state.trim()) subjectParts.push(`ST=${subject.state.trim()}`);
            if (subject.locality && subject.locality.trim()) subjectParts.push(`L=${subject.locality.trim()}`);
            if (subject.organization && subject.organization.trim()) subjectParts.push(`O=${subject.organization.trim()}`);
            if (subject.organizationalUnit && subject.organizationalUnit.trim()) subjectParts.push(`OU=${subject.organizationalUnit.trim()}`);
            subjectParts.push(`CN=${cn}`);
            if (subject.email && subject.email.trim()) subjectParts.push(`emailAddress=${subject.email.trim()}`);
            const subjectString = subjectParts.join(", ");

            // 11. Xây dựng Text Details chuẩn tương đương OpenSSL X509_REQ_print_ex
            const sigAlgName = `${hashAlg.toLowerCase().replace("-", "")}WithRSAEncryption`;
            const textDetails = [
                "Certificate Request:",
                "    Data:",
                "        Version: 1 (0x0)",
                `        Subject: ${subjectString}`,
                "        Subject Public Key Info:",
                "            Public Key Algorithm: rsaEncryption",
                `                RSA Public-Key: (${size} bit)`,
                "                Exponent: 65537 (0x10001)",
                "        Attributes:",
                "            (none)",
                `    Signature Algorithm: ${sigAlgName}`,
                "    Signature Value:",
                bytesToHexDump(signatureDer, "        "),
                "    Verification:",
                `        Certificate request self-signature verify ${isValid ? "OK (Hợp lệ 100%)" : "FAILED (Lỗi chữ ký)"}`,
                `    SHA-256 Fingerprint:`,
                `        ${fingerprint}`
            ].join("\n");

            return {
                success: true,
                privateKeyPem: privateKeyPem,
                csrPem: csrPem,
                textDetails: textDetails,
                keySize: size,
                digest: hashAlg,
                verified: isValid
            };
        } catch (e) {
            return {
                success: false,
                error: "Lỗi sinh cặp khóa & CSR: " + (e.message || e.toString())
            };
        }
    }

    return {
        generate: generate,
        SIG_ALGS: SIG_ALGS
    };
}));
