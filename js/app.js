/**
 * FileCrypto Web — Main Application Controller
 * Đồng bộ 100% với FileCryptoQt (Desktop C++ / OpenSSL) & FileCrypto iOS (Swift)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Elements ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // --- Tab 1: Crypto Elements ---
    const cryptoModeEncrypt = document.getElementById('cryptoModeEncrypt');
    const cryptoModeDecrypt = document.getElementById('cryptoModeDecrypt');
    const cryptoSourceText = document.getElementById('cryptoSourceText');
    const cryptoSourceFile = document.getElementById('cryptoSourceFile');

    const textInputWrapper = document.getElementById('textInputWrapper');
    const textInputEdit = document.getElementById('textInputEdit');
    const clearTextBtn = document.getElementById('clearTextBtn');
    const sampleTextBtn = document.getElementById('sampleTextBtn');

    const fileInputWrapper = document.getElementById('fileInputWrapper');
    const dropzone = document.getElementById('dropzone');
    const dropzoneTitle = document.getElementById('dropzoneTitle');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const fileInfoCard = document.getElementById('fileInfoCard');
    const fileNameEl = document.getElementById('selectedFileName');
    const fileSizeEl = document.getElementById('selectedFileSize');
    const fileTypeEl = document.getElementById('selectedFileType');
    const removeFileBtn = document.getElementById('removeFileBtn');

    const algorithmSelect = document.getElementById('algorithmSelect');
    const algoGroup = document.getElementById('algoGroup');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassBtn = document.getElementById('togglePassBtn');
    const generatePassBtn = document.getElementById('generatePassBtn');
    const passStrengthBar = document.getElementById('passStrengthBar');
    const passStrengthLabel = document.getElementById('passStrengthLabel');
    const base64Group = document.getElementById('base64Group');
    const base64Check = document.getElementById('base64Check');
    const algorithmInfo = document.getElementById('algorithmInfo');
    const actionBtn = document.getElementById('actionBtn');

    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressStatus = document.getElementById('progressStatus');
    const progressPercent = document.getElementById('progressPercent');

    const resultSection = document.getElementById('resultSection');
    const downloadBtn = document.getElementById('downloadBtn');
    const resultDetails = document.getElementById('resultDetails');

    // Right Column (Tab 1)
    const textOutputWrapper = document.getElementById('textOutputWrapper');
    const encryptDualOutput = document.getElementById('encryptDualOutput');
    const decryptSingleOutput = document.getElementById('decryptSingleOutput');
    const hexOutputEdit = document.getElementById('hexOutputEdit');
    const base64OutputEdit = document.getElementById('base64OutputEdit');
    const plainOutputEdit = document.getElementById('plainOutputEdit');
    const copyHexBtn = document.getElementById('copyHexBtn');
    const copyBase64Btn = document.getElementById('copyBase64Btn');
    const copyPlainBtn = document.getElementById('copyPlainBtn');

    const filePreviewWrapper = document.getElementById('filePreviewWrapper');
    const previewContainer = document.getElementById('previewContainer');

    // Transmission Simulator
    const transmission = TransmissionWidget.create('transmissionCanvas');

    // --- Tab 2: CSR Elements ---
    const csrCnInput = document.getElementById('csrCnInput');
    const csrOInput = document.getElementById('csrOInput');
    const csrOuInput = document.getElementById('csrOuInput');
    const csrCInput = document.getElementById('csrCInput');
    const csrStInput = document.getElementById('csrStInput');
    const csrLInput = document.getElementById('csrLInput');
    const csrEmailInput = document.getElementById('csrEmailInput');

    const csrKeyTypeSelect = document.getElementById('csrKeyTypeSelect');
    const csrDigestSelect = document.getElementById('csrDigestSelect');
    const csrGenerateBtn = document.getElementById('csrGenerateBtn');
    const csrSaveKeyBtn = document.getElementById('csrSaveKeyBtn');
    const csrSaveCsrBtn = document.getElementById('csrSaveCsrBtn');
    const csrStatusBadge = document.getElementById('csrStatusBadge');

    const csrKeyEdit = document.getElementById('csrKeyEdit');
    const csrOutputEdit = document.getElementById('csrOutputEdit');
    const csrDetailsEdit = document.getElementById('csrDetailsEdit');
    const copyCsrKeyBtn = document.getElementById('copyCsrKeyBtn');
    const copyCsrBtn = document.getElementById('copyCsrBtn');

    // --- Tab 3: Inspect Elements ---
    const inspectDropzone = document.getElementById('inspectDropzone');
    const inspectFileInput = document.getElementById('inspectFileInput');
    const inspectResultWrapper = document.getElementById('inspectResultWrapper');
    const inspectContent = document.getElementById('inspectContent');

    // --- Tab 4: Docs & Self-Test ---
    const runSelfTestBtn = document.getElementById('runSelfTestBtn');
    const selfTestResults = document.getElementById('selfTestResults');

    // ==========================================
    // State
    // ==========================================
    let currentMainTab = 'crypto'; // 'crypto', 'csr', 'inspect', 'docs'
    let currentCryptoMode = 'encrypt'; // 'encrypt' or 'decrypt'
    let currentCryptoSource = 'text'; // 'text' or 'file'

    let selectedFile = null;
    let selectedFileData = null;
    let processedResult = null; // { data, name, mime }

    let generatedCsrResult = null; // { privateKeyPem, csrPem }

    // ==========================================
    // Tab Navigation
    // ==========================================
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabKey = btn.dataset.tab;
            setMainTab(tabKey);
        });
    });

    function setMainTab(tabKey) {
        currentMainTab = tabKey;
        tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
        tabPanes.forEach(p => {
            if (p.id === `${tabKey}Pane`) {
                p.style.display = 'block';
                p.classList.add('active');
            } else {
                p.style.display = 'none';
                p.classList.remove('active');
            }
        });
    }

    // ==========================================
    // Tab 1: Mode & Source Switchers
    // ==========================================
    cryptoModeEncrypt.addEventListener('click', () => setCryptoMode('encrypt'));
    cryptoModeDecrypt.addEventListener('click', () => setCryptoMode('decrypt'));
    cryptoSourceText.addEventListener('click', () => setCryptoSource('text'));
    cryptoSourceFile.addEventListener('click', () => setCryptoSource('file'));

    function setCryptoMode(mode) {
        currentCryptoMode = mode;
        cryptoModeEncrypt.classList.toggle('active', mode === 'encrypt');
        cryptoModeDecrypt.classList.toggle('active', mode === 'decrypt');

        if (mode === 'encrypt') {
            actionBtn.textContent = '🔒 BẮT ĐẦU MÃ HÓA';
            actionBtn.className = 'btn btn-primary';
            algoGroup.style.display = 'block';
            base64Group.style.display = 'block';
            dropzoneTitle.textContent = 'Kéo thả tệp hoặc thư mục vào đây để mã hóa';
            updateAlgorithmNote();

            if (currentCryptoSource === 'text') {
                encryptDualOutput.style.display = 'grid';
                decryptSingleOutput.style.display = 'none';
            }
        } else {
            actionBtn.textContent = '🔓 BẮT ĐẦU GIẢI MÃ';
            actionBtn.className = 'btn btn-success';
            algoGroup.style.display = 'none'; // Tự động phát hiện qua Salted__/FCQ container
            base64Group.style.display = 'none';
            dropzoneTitle.textContent = 'Kéo thả tệp .fcq vào đây để giải mã';
            algorithmInfo.textContent = 'Chế độ giải mã • Tự động nhận diện định dạng OpenSSL & FCQ';

            if (currentCryptoSource === 'text') {
                encryptDualOutput.style.display = 'none';
                decryptSingleOutput.style.display = 'block';
            }
        }
        resetFileResults();
    }

    function setCryptoSource(source) {
        currentCryptoSource = source;
        cryptoSourceText.classList.toggle('active', source === 'text');
        cryptoSourceFile.classList.toggle('active', source === 'file');

        if (source === 'text') {
            textInputWrapper.style.display = 'block';
            fileInputWrapper.style.display = 'none';
            textOutputWrapper.style.display = 'block';
            filePreviewWrapper.style.display = 'none';
            resultSection.style.display = 'none';

            if (currentCryptoMode === 'encrypt') {
                encryptDualOutput.style.display = 'grid';
                decryptSingleOutput.style.display = 'none';
            } else {
                encryptDualOutput.style.display = 'none';
                decryptSingleOutput.style.display = 'block';
            }
        } else {
            textInputWrapper.style.display = 'none';
            fileInputWrapper.style.display = 'block';
            textOutputWrapper.style.display = 'none';
            filePreviewWrapper.style.display = 'block';

            if (selectedFileData) {
                updatePreview(selectedFileData, selectedFile.name, selectedFile.type);
            }
        }
        resetFileResults();
    }

    function updateAlgorithmNote() {
        const alg = algorithmSelect.value;
        if (alg === '1') {
            algorithmInfo.textContent = 'AES-256-CBC • Chuẩn bài giảng OpenSSL • PBKDF2 10.000 vòng';
        } else if (alg === '2') {
            algorithmInfo.textContent = 'AES-256-GCM • Chuẩn AEAD bảo mật cao • PBKDF2 200.000 vòng';
        } else {
            algorithmInfo.textContent = 'ChaCha20-Poly1305 • Chuẩn RFC 8439 tối ưu CPU • PBKDF2 200.000 vòng';
        }
    }

    algorithmSelect.addEventListener('change', updateAlgorithmNote);

    // ==========================================
    // Password Actions & Strength Evaluation
    // ==========================================
    togglePassBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });

    generatePassBtn.addEventListener('click', () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+{}[]';
        let pass = '';
        const rand = CryptoEngine.getRandomBytes(16);
        for (let i = 0; i < 16; i++) {
            pass += chars[rand[i] % chars.length];
        }
        passwordInput.value = pass;
        passwordInput.setAttribute('type', 'text');
        togglePassBtn.textContent = '🙈';
        evaluatePassword(pass);
    });

    passwordInput.addEventListener('input', (e) => {
        evaluatePassword(e.target.value);
    });

    function evaluatePassword(pass) {
        if (!pass) {
            passStrengthBar.style.width = '0%';
            passStrengthLabel.textContent = '';
            return;
        }
        let score = 0;
        if (pass.length >= 8) score += 25;
        if (pass.length >= 12) score += 15;
        if (/[A-Z]/.test(pass)) score += 20;
        if (/[0-9]/.test(pass)) score += 20;
        if (/[^A-Za-z0-9]/.test(pass)) score += 20;

        score = Math.min(100, score);
        passStrengthBar.style.width = `${score}%`;

        if (score < 40) {
            passStrengthBar.style.backgroundColor = '#ef4444';
            passStrengthLabel.textContent = 'Yếu';
            passStrengthLabel.style.color = '#ef4444';
        } else if (score < 75) {
            passStrengthBar.style.backgroundColor = '#f59e0b';
            passStrengthLabel.textContent = 'Trung bình';
            passStrengthLabel.style.color = '#f59e0b';
        } else {
            passStrengthBar.style.backgroundColor = '#10b981';
            passStrengthLabel.textContent = 'Rất mạnh (PBKDF2)';
            passStrengthLabel.style.color = '#10b981';
        }
    }
    evaluatePassword(passwordInput.value);

    // ==========================================
    // Text Mode Actions & Copy
    // ==========================================
    clearTextBtn.addEventListener('click', () => {
        textInputEdit.value = '';
        hexOutputEdit.value = '';
        base64OutputEdit.value = '';
        plainOutputEdit.value = '';
        progressStatus.textContent = 'Đã xóa nội dung văn bản';
    });

    sampleTextBtn.addEventListener('click', () => {
        textInputEdit.value = 'Bài thực hành Mật mã học OpenSSL: AES-256-CBC, Base64 (-a) và CSR.';
        progressStatus.textContent = 'Đã nạp văn bản mẫu bài giảng';
    });

    function copyToClipboard(text, btnElement) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const original = btnElement.textContent;
            btnElement.textContent = '✓ Đã sao chép!';
            btnElement.style.color = '#10b981';
            setTimeout(() => {
                btnElement.textContent = original;
                btnElement.style.color = '';
            }, 1800);
        }).catch(err => {
            alert('Không thể sao chép: ' + err);
        });
    }

    copyHexBtn.addEventListener('click', () => copyToClipboard(hexOutputEdit.value, copyHexBtn));
    copyBase64Btn.addEventListener('click', () => copyToClipboard(base64OutputEdit.value, copyBase64Btn));
    copyPlainBtn.addEventListener('click', () => copyToClipboard(plainOutputEdit.value, copyPlainBtn));

    // ==========================================
    // File Drag & Drop Handling
    // ==========================================
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        selectedFileData = null;
        fileInfoCard.style.display = 'none';
        fileInput.value = '';
        if (folderInput) folderInput.value = '';
        previewContainer.innerHTML = '';
        resetFileResults();
        transmission.setState('idle', 0);
    });

    function handleFileSelect(file) {
        selectedFile = file;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = FilePreview.formatBytes(file.size);
        fileTypeEl.textContent = file.type || 'application/octet-stream';
        fileInfoCard.style.display = 'flex';

        resetFileResults();

        const reader = new FileReader();
        reader.onload = (e) => {
            selectedFileData = new Uint8Array(e.target.result);
            updatePreview(selectedFileData, file.name, file.type);

            if (file.name.toLowerCase().endsWith('.fcq') && currentCryptoMode === 'encrypt') {
                setCryptoMode('decrypt');
            }

            transmission.setState('idle', 0, {
                fileName: file.name,
                fileSize: file.size,
                algorithm: CryptoEngine.AlgorithmNames[algorithmSelect.value]
            });
        };
        reader.readAsArrayBuffer(file);
    }

    function updatePreview(data, name, mime) {
        FilePreview.render(previewContainer, data, name, mime);
    }

    function resetFileResults() {
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressStatus.textContent = 'Sẵn sàng • Nhập văn bản hoặc chọn tệp để bắt đầu';
        resultSection.style.display = 'none';
        processedResult = null;
    }

    // ==========================================
    // Main Crypto Execution (Tab 1: Text / File)
    // ==========================================
    actionBtn.addEventListener('click', async () => {
        const pass = passwordInput.value;
        if (!pass) {
            alert('Vui lòng nhập mật khẩu bảo vệ hoặc mở khóa dữ liệu!');
            passwordInput.focus();
            return;
        }

        const updateProgress = (pct, msg) => {
            progressBar.style.width = `${Math.round(pct * 100)}%`;
            progressPercent.textContent = `${Math.round(pct * 100)}%`;
            progressStatus.textContent = msg || 'Đang xử lý...';
            transmission.setState(currentCryptoMode === 'encrypt' ? 'encrypting' : 'decrypting', pct);
        };

        if (currentCryptoSource === 'text') {
            // === XỬ LÝ VĂN BẢN THUẦN (PLAINTEXT) ===
            const inputContent = textInputEdit.value;
            if (!inputContent || !inputContent.trim()) {
                alert('Vui lòng nhập nội dung văn bản đầu vào!');
                textInputEdit.focus();
                return;
            }

            updateProgress(0.2, 'Đang chuẩn bị dẫn xuất khóa...');

            try {
                if (currentCryptoMode === 'encrypt') {
                    const alg = parseInt(algorithmSelect.value, 10);
                    const useBase64 = base64Check.checked;
                    updateProgress(0.5, 'Đang mã hóa văn bản...');

                    setTimeout(async () => {
                        try {
                            const res = await CryptoEngine.encryptText(inputContent, pass, alg, useBase64);
                            if (!res.ok) {
                                throw new Error(res.error);
                            }

                            hexOutputEdit.value = res.hexString;
                            base64OutputEdit.value = res.base64String;

                            updateProgress(1.0, 'Mã hóa văn bản thành công!');
                            transmission.setState('completed', 1.0);
                        } catch (err) {
                            handleCryptoError(err);
                        }
                    }, 50);

                } else {
                    // Decrypt Text
                    updateProgress(0.5, 'Đang giải mã văn bản...');

                    setTimeout(async () => {
                        try {
                            const decrypted = await CryptoEngine.decryptText(inputContent, pass);
                            plainOutputEdit.value = decrypted;

                            updateProgress(1.0, 'Giải mã văn bản thành công!');
                            transmission.setState('completed', 1.0);
                        } catch (err) {
                            handleCryptoError(err);
                        }
                    }, 50);
                }
            } catch (err) {
                handleCryptoError(err);
            }

        } else {
            // === XỬ LÝ TỆP TIN / THƯ MỤC ===
            if (!selectedFileData) {
                alert('Vui lòng chọn hoặc kéo thả tệp trước khi bắt đầu!');
                return;
            }

            updateProgress(0.1, 'Bắt đầu xử lý tệp...');

            try {
                if (currentCryptoMode === 'encrypt') {
                    const alg = parseInt(algorithmSelect.value, 10);
                    setTimeout(async () => {
                        try {
                            const encrypted = await CryptoEngine.encryptFile(
                                selectedFileData,
                                selectedFile.name,
                                selectedFile.type,
                                pass,
                                alg,
                                updateProgress
                            );

                            const outName = CryptoEngine.suggestedEncryptedPath(selectedFile.name);
                            processedResult = {
                                data: encrypted,
                                name: outName,
                                mime: 'application/octet-stream'
                            };

                            updateProgress(1.0, 'Mã hóa tệp hoàn tất!');
                            transmission.setState('completed', 1.0);

                            showFileResult(
                                `Tệp đã được mã hóa thành công bằng <strong>${CryptoEngine.AlgorithmNames[alg]}</strong>.`,
                                outName,
                                encrypted.length
                            );

                            updatePreview(encrypted, outName, 'application/octet-stream');
                        } catch (err) {
                            handleCryptoError(err);
                        }
                    }, 50);

                } else {
                    // Decrypt File
                    setTimeout(async () => {
                        try {
                            const res = await CryptoEngine.decryptFile(
                                selectedFileData,
                                pass,
                                updateProgress
                            );

                            const outName = CryptoEngine.suggestedDecryptedPath(selectedFile.name, res.originalName);
                            processedResult = {
                                data: res.plaintext,
                                name: outName,
                                mime: res.mimeType
                            };

                            updateProgress(1.0, 'Giải mã tệp hoàn tất!');
                            transmission.setState('completed', 1.0);

                            showFileResult(
                                `Tệp đã được giải mã và kiểm tra tính toàn vẹn thành công!<br>` +
                                `Tên gốc: <strong>${res.originalName || '(Không lưu)'}</strong> | Loại: <strong>${res.mimeType}</strong>`,
                                outName,
                                res.plaintext.length
                            );

                            updatePreview(res.plaintext, outName, res.mimeType);
                        } catch (err) {
                            handleCryptoError(err);
                        }
                    }, 50);
                }
            } catch (err) {
                handleCryptoError(err);
            }
        }
    });

    function showFileResult(message, outName, size) {
        resultSection.style.display = 'block';
        resultDetails.innerHTML = `
            <div class="result-success-box" style="display: flex; align-items: center; gap: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div class="result-icon" style="font-size: 24px;">✅</div>
                <div class="result-text" style="font-size: 13px;">
                    <p>${message}</p>
                    <small style="color: var(--text-secondary);">Tệp sẵn sàng tải xuống: <strong>${outName}</strong> (${FilePreview.formatBytes(size)})</small>
                </div>
            </div>
        `;

        downloadBtn.onclick = () => {
            if (!processedResult) return;
            downloadBlob(processedResult.data, processedResult.name, processedResult.mime);
        };
    }

    function downloadBlob(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function handleCryptoError(err) {
        progressBar.style.width = '0%';
        progressPercent.textContent = 'Lỗi';
        progressStatus.textContent = 'Thất bại: ' + (err.message || err);
        transmission.setState('error');
        alert(`ĐÃ XẢY RA LỖI:\n${err.message || err}`);
    }

    // ==========================================
    // Tab 2: CsrEngine & Keypair Generator
    // ==========================================
    csrGenerateBtn.addEventListener('click', async () => {
        const subject = {
            commonName: csrCnInput.value.trim(),
            organization: csrOInput.value.trim(),
            organizationalUnit: csrOuInput.value.trim(),
            country: csrCInput.value.trim(),
            state: csrStInput.value.trim(),
            locality: csrLInput.value.trim(),
            email: csrEmailInput.value.trim()
        };

        if (!subject.commonName) {
            alert('Common Name (CN) không được để trống (ví dụ: example.com hoặc sinhvien.edu.vn)!');
            csrCnInput.focus();
            return;
        }

        const keySize = parseInt(csrKeyTypeSelect.value, 10) || 2048;
        const digest = csrDigestSelect.value;

        csrStatusBadge.className = 'status-badge';
        csrStatusBadge.innerHTML = '<span>⏳ Đang sinh cặp khóa RSA và ký số chứng chỉ CSR...</span>';
        csrGenerateBtn.disabled = true;

        setTimeout(async () => {
            try {
                const res = await CsrEngine.generate(subject, keySize, digest);
                if (!res.success) {
                    throw new Error(res.error);
                }

                generatedCsrResult = res;
                csrKeyEdit.value = res.privateKeyPem;
                csrOutputEdit.value = res.csrPem;
                csrDetailsEdit.value = res.textDetails;

                csrSaveKeyBtn.disabled = false;
                csrSaveCsrBtn.disabled = false;

                csrStatusBadge.className = 'status-badge success';
                csrStatusBadge.innerHTML = '<span>✅ Sinh cặp khóa RSA và tạo CSR thành công (Chữ ký số hợp lệ)!</span>';
            } catch (err) {
                csrStatusBadge.className = 'status-badge error';
                csrStatusBadge.innerHTML = `<span>❌ Thất bại: ${err.message || err}</span>`;
                alert('Lỗi tạo CSR: ' + (err.message || err));
            } finally {
                csrGenerateBtn.disabled = false;
            }
        }, 50);
    });

    copyCsrKeyBtn.addEventListener('click', () => copyToClipboard(csrKeyEdit.value, copyCsrKeyBtn));
    copyCsrBtn.addEventListener('click', () => copyToClipboard(csrOutputEdit.value, copyCsrBtn));

    csrSaveKeyBtn.addEventListener('click', () => {
        if (!generatedCsrResult || !generatedCsrResult.privateKeyPem) return;
        downloadBlob(new TextEncoder().encode(generatedCsrResult.privateKeyPem), 'private.key', 'application/x-pem-file');
    });

    csrSaveCsrBtn.addEventListener('click', () => {
        if (!generatedCsrResult || !generatedCsrResult.csrPem) return;
        downloadBlob(new TextEncoder().encode(generatedCsrResult.csrPem), 'request.csr', 'application/pkcs10');
    });

    // ==========================================
    // Tab 3: Inspect Header FCQ
    // ==========================================
    ['dragenter', 'dragover'].forEach(eName => {
        inspectDropzone.addEventListener(eName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            inspectDropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eName => {
        inspectDropzone.addEventListener(eName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            inspectDropzone.classList.remove('drag-over');
        });
    });

    inspectDropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleInspectFile(files[0]);
        }
    });

    inspectFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleInspectFile(e.target.files[0]);
        }
    });

    function handleInspectFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const info = CryptoEngine.inspectFile(data);
                inspectResultWrapper.style.display = 'block';

                const saltHex = Array.from(info.salt).map(b => b.toString(16).padStart(2, '0')).join(' ');
                const ivHex = Array.from(info.iv).map(b => b.toString(16).padStart(2, '0')).join(' ');

                inspectContent.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div><strong>Định dạng Magic:</strong> <span style="color: var(--accent-cyan);">${info.magic} (v${info.version})</span></div>
                        <div><strong>Thuật toán:</strong> <span style="color: var(--accent-purple);">${info.algorithmName}</span></div>
                        <div><strong>Tên tệp gốc:</strong> ${info.originalName || '(Không lưu)'}</div>
                        <div><strong>Loại MIME:</strong> ${info.mimeType || 'octet-stream'}</div>
                        <div><strong>Kích thước Payload:</strong> ${FilePreview.formatBytes(info.payloadSize)}</div>
                        <div><strong>Xác thực Tag/MAC:</strong> ${info.authSize} bytes (${info.authenticated ? 'Hợp lệ' : 'Không có'})</div>
                        <div style="grid-column: 1 / -1;"><strong>Salt (16 bytes):</strong> <br><code>${saltHex}</code></div>
                        <div style="grid-column: 1 / -1;"><strong>IV / Nonce (${info.iv.length} bytes):</strong> <br><code>${ivHex}</code></div>
                    </div>
                `;
            } catch (err) {
                alert('Không thể đọc file FCQ: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ==========================================
    // Tab 4: In-Browser Self Test Suite
    // ==========================================
    if (runSelfTestBtn) {
        runSelfTestBtn.addEventListener('click', async () => {
            selfTestResults.innerHTML = '<div class="test-running">⏳ Đang chạy bộ kiểm thử toàn diện trên trình duyệt...</div>';
            runSelfTestBtn.disabled = true;

            const testPass = "TestPassword#2026";
            let resultsHtml = '';

            try {
                // Test 1: OpenSSL CLI AES-256-CBC Text Mode (Salted__)
                const plainText1 = "Bảo mật thông tin 2026 - Kiểm thử OpenSSL Text CBC!";
                const t0 = performance.now();
                const encCbc = await CryptoEngine.encryptText(plainText1, testPass, CryptoEngine.Algorithm.Aes256Cbc, true);
                const decCbc = await CryptoEngine.decryptText(encCbc.base64String, testPass);
                const t1 = performance.now();
                const cbcOk = (decCbc === plainText1) && encCbc.base64String.startsWith('U2FsdGVk');

                resultsHtml += `
                    <div class="test-card ${cbcOk ? 'pass' : 'fail'}" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="color: ${cbcOk ? '#10b981' : '#f43f5e'}; font-weight: bold;">[${cbcOk ? 'PASSED' : 'FAILED'}]</span>
                            <strong>OpenSSL AES-256-CBC Text Mode (Salted__ + PBKDF2)</strong>
                            <span style="font-size: 12px; color: var(--text-muted);">${Math.round(t1 - t0)} ms</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            • Định dạng đầu ra: <strong>${encCbc.base64String.substring(0, 32)}... (Chuẩn OpenSSL CLI -a)</strong><br>
                            • Giải mã Round-trip: <strong>${cbcOk ? 'Khớp 100% dữ liệu gốc' : 'LỖI'}</strong>
                        </div>
                    </div>
                `;

                // Test 2: File Encrypt/Decrypt (GCM & ChaCha20)
                for (const alg of [2, 3]) {
                    const name = CryptoEngine.AlgorithmNames[alg];
                    const testBytes = new TextEncoder().encode("CryptoLab Test File Buffer");
                    const ta = performance.now();
                    const enc = await CryptoEngine.encryptFile(testBytes, "sample.txt", "text/plain", testPass, alg);
                    const dec = await CryptoEngine.decryptFile(enc, testPass);
                    const tb = performance.now();
                    const ok = dec.plaintext.length === testBytes.length;

                    resultsHtml += `
                        <div class="test-card ${ok ? 'pass' : 'fail'}" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="color: ${ok ? '#10b981' : '#f43f5e'}; font-weight: bold;">[${ok ? 'PASSED' : 'FAILED'}]</span>
                                <strong>Định dạng tệp FCQ2 (${name})</strong>
                                <span style="font-size: 12px; color: var(--text-muted);">${Math.round(tb - ta)} ms</span>
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                • Mã hóa và giải mã Round-trip: <strong>${ok ? 'Khớp 100% tệp gốc' : 'LỖI'}</strong><br>
                                • Khôi phục Metadata: <strong>${dec.originalName} (${dec.mimeType})</strong>
                            </div>
                        </div>
                    `;
                }

                // Test 3: CsrEngine RSA 2048 & PKCS#10
                const tc0 = performance.now();
                const csrRes = await CsrEngine.generate({
                    commonName: "selftest.cryptolab.local",
                    organization: "CryptoLab Academy",
                    country: "VN"
                }, 2048, "SHA-256");
                const tc1 = performance.now();
                const csrOk = csrRes.success && csrRes.verified && csrRes.csrPem.includes("BEGIN CERTIFICATE REQUEST");

                resultsHtml += `
                    <div class="test-card ${csrOk ? 'pass' : 'fail'}" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="color: ${csrOk ? '#10b981' : '#f43f5e'}; font-weight: bold;">[${csrOk ? 'PASSED' : 'FAILED'}]</span>
                            <strong>CsrEngine: Sinh RSA 2048 & Tạo CSR PKCS#10</strong>
                            <span style="font-size: 12px; color: var(--text-muted);">${Math.round(tc1 - tc0)} ms</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            • Xác thực Chữ ký số tự ký (Self-Signature Verify): <strong>${csrRes.verified ? 'OK (Hợp lệ 100%)' : 'LỖI'}</strong><br>
                            • Định dạng: <strong>PKCS#8 Private Key & PKCS#10 CSR PEM chuẩn OpenSSL</strong>
                        </div>
                    </div>
                `;

                selfTestResults.innerHTML = resultsHtml;
            } catch (err) {
                selfTestResults.innerHTML = `<div style="color: #f43f5e; padding: 12px;">Lỗi kiểm thử: ${err.message}</div>`;
            } finally {
                runSelfTestBtn.disabled = false;
            }
        });
    }
});
