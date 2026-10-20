#include "mainwindow.h"
#include "ui_mainwindow.h"
#include "cryptoengine.h"
#include "csrengine.h"

#include <QApplication>
#include <QClipboard>
#include <QDesktopServices>
#include <QDir>
#include <QDirIterator>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QFileDialog>
#include <QFileInfo>
#include <QFutureWatcher>
#include <QMessageBox>
#include <QMimeData>
#include <QTimer>
#include <QUrl>
#include <QtConcurrent>
#include <stdexcept>

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
    , ui(new Ui::MainWindow)
    , m_watcher(new QFutureWatcher<QVariantMap>(this))
    , m_loadingTimer(new QTimer(this))
{
    ui->setupUi(this);
    setAcceptDrops(true);

    // Setup Splitters
    ui->textOutputSplitter->setSizes({500, 500});
    ui->previewSplitter->setSizes({500, 500});
    ui->csrOutputSplitter->setSizes({500, 500});

    // Populate Tab 1 Algorithms
    ui->algorithmBox->addItem("AES-256-CBC (Chuẩn OpenSSL CLI)", int(CryptoEngine::Algorithm::Aes256Cbc));
    ui->algorithmBox->addItem("AES-256-GCM (Có xác thực AEAD)", int(CryptoEngine::Algorithm::Aes256Gcm));
    ui->algorithmBox->addItem("ChaCha20-Poly1305 (Dòng AEAD)", int(CryptoEngine::Algorithm::ChaCha20Poly1305));

    // Populate Tab 2 Key Types & Digests
    ui->csrKeyTypeCombo->addItem("RSA 2048-bit (Tiêu chuẩn phổ biến)", int(CsrEngine::KeyType::Rsa2048));
    ui->csrKeyTypeCombo->addItem("RSA 4096-bit (Bảo mật cao)", int(CsrEngine::KeyType::Rsa4096));
    ui->csrKeyTypeCombo->addItem("ECC NIST P-256 (prime256v1)", int(CsrEngine::KeyType::EccPrime256v1));
    ui->csrKeyTypeCombo->addItem("ECC NIST P-384 (secp384r1)", int(CsrEngine::KeyType::EccSecp384r1));

    ui->csrDigestCombo->addItem("SHA-256 (Khuyến nghị)", int(CsrEngine::DigestType::Sha256));
    ui->csrDigestCombo->addItem("SHA-384", int(CsrEngine::DigestType::Sha384));
    ui->csrDigestCombo->addItem("SHA-512", int(CsrEngine::DigestType::Sha512));

    // Styling
    setStyleSheet(R"(
        * { font-size: 13px; color: #e3e9f1; }
        QMainWindow, QWidget { background: #1a1f29; }
        QTabWidget::pane { border: 1px solid #364253; background: #1a1f29; border-radius: 6px; }
        QTabBar::tab { background: #232a36; color: #8fa0b5; border: 1px solid #364253; border-bottom: none; border-top-left-radius: 6px; border-top-right-radius: 6px; padding: 10px 18px; font-weight: 600; margin-right: 4px; }
        QTabBar::tab:selected { background: #1a1f29; color: #64b5f6; border-bottom: 2px solid #64b5f6; }
        QTabBar::tab:hover:!selected { background: #2c3545; color: #d0d7de; }
        QWidget#controlPanel, QWidget#csrControlPanel { background: #151922; border-radius: 6px; }
        QGroupBox { background: #202632; border: 1px solid #384556; border-radius: 6px; margin-top: 12px; padding: 10px 8px 8px 8px; font-weight: 600; }
        QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 6px; color: #7cb9f7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        QLineEdit, QComboBox, QPlainTextEdit { background: #12161e; border: 1px solid #3d4b5d; border-radius: 5px; padding: 7px; color: #f0f4f8; }
        QLineEdit:focus, QComboBox:focus, QPlainTextEdit:focus { border: 1px solid #58a6ff; }
        QPlainTextEdit { font-family: Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.4; }
        QPushButton { background: #2b3545; border: 1px solid #48576c; border-radius: 5px; padding: 7px 12px; color: #e1e8f0; font-weight: 500; }
        QPushButton:hover { background: #38465b; border-color: #637794; }
        QPushButton:pressed { background: #1e2632; }
        QPushButton#runButton, QPushButton#csrGenerateButton { background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #1a68b5, stop:1 #2185d0); color: white; font-weight: bold; border: 1px solid #4ba3e3; font-size: 14px; }
        QPushButton#runButton:hover, QPushButton#csrGenerateButton:hover { background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #1d74ca, stop:1 #2593e6); }
        QPushButton:disabled { color: #586575; background: #1c222c; border-color: #2a3340; }
        QProgressBar { background: #0f131a; border: 1px solid #384556; border-radius: 5px; text-align: center; min-height: 22px; color: #e3e9f1; font-weight: 600; }
        QProgressBar::chunk { background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #2575fc, stop:1 #6a11cb); border-radius: 4px; }
        QLabel#statusLabel, QLabel#csrStatusLabel { color: #8fa0b5; }
        QLabel#algorithmInfo { color: #5cdba0; font-size: 11px; }
        QCheckBox { spacing: 6px; font-weight: 500; }
        QCheckBox::indicator { width: 16px; height: 16px; border-radius: 3px; border: 1px solid #48576c; background: #12161e; }
        QCheckBox::indicator:checked { background: #2575fc; border-color: #58a6ff; }
        QSplitter::handle { background: #2f3a4a; width: 3px; }
    )");

    // Tab 1 Connections
    connect(ui->encryptMode, &QRadioButton::toggled, this, &MainWindow::updateMode);
    connect(ui->textModeRadio, &QRadioButton::toggled, this, &MainWindow::updateInputType);
    connect(ui->fileModeRadio, &QRadioButton::toggled, this, &MainWindow::updateInputType);
    connect(ui->inputButton, &QPushButton::clicked, this, &MainWindow::chooseInput);
    connect(ui->folderButton, &QPushButton::clicked, this, &MainWindow::chooseFolderInput);
    connect(ui->outputButton, &QPushButton::clicked, this, &MainWindow::chooseOutput);
    connect(ui->inputEdit, &QLineEdit::textChanged, this, &MainWindow::updateInput);
    connect(ui->algorithmBox, &QComboBox::currentIndexChanged, this, &MainWindow::updateAlgorithm);
    connect(ui->runButton, &QPushButton::clicked, this, &MainWindow::run);
    connect(ui->copyHexButton, &QPushButton::clicked, this, &MainWindow::copyHex);
    connect(ui->copyBase64Button, &QPushButton::clicked, this, &MainWindow::copyBase64);
    connect(ui->openResultButton, &QPushButton::clicked, this, &MainWindow::openResult);
    connect(ui->openFolderButton, &QPushButton::clicked, this, &MainWindow::openFolder);
    connect(m_watcher, &QFutureWatcher<QVariantMap>::finished, this, &MainWindow::operationFinished);

    // Tab 2 Connections
    connect(ui->csrGenerateButton, &QPushButton::clicked, this, &MainWindow::generateCsr);
    connect(ui->csrSaveKeyButton, &QPushButton::clicked, this, &MainWindow::savePrivateKey);
    connect(ui->csrSaveCsrButton, &QPushButton::clicked, this, &MainWindow::saveCsr);
    connect(ui->copyKeyButton, &QPushButton::clicked, this, &MainWindow::copyPrivateKey);
    connect(ui->copyCsrButton, &QPushButton::clicked, this, &MainWindow::copyCsr);

    // Loading Animation Timer
    connect(m_loadingTimer, &QTimer::timeout, this, [this] {
        const QStringList frames{"●  ○  ○", "○  ●  ○", "○  ○  ●", "○  ●  ○"};
        ui->loadingLabel->setText(frames[m_loadingFrame++ % frames.size()] +
                                 (m_decrypting ? "   Đang giải mã và xác thực..." : "   Đang mã hóa và đóng gói..."));
    });
    m_loadingTimer->setInterval(180);

    // Initial state
    updateInputType();
    updateAlgorithm();
    updateMode();
}

MainWindow::~MainWindow() {
    if (m_watcher->isRunning()) m_watcher->waitForFinished();
    delete ui;
}

void MainWindow::dragEnterEvent(QDragEnterEvent* e) {
    if (e->mimeData()->hasUrls() && !e->mimeData()->urls().isEmpty() && e->mimeData()->urls().first().isLocalFile()) {
        e->acceptProposedAction();
    }
}

void MainWindow::dropEvent(QDropEvent* e) {
    auto urls = e->mimeData()->urls();
    if (!urls.isEmpty() && QFileInfo(urls.first().toLocalFile()).exists()) {
        ui->fileModeRadio->setChecked(true);
        setInputPath(urls.first().toLocalFile());
        e->acceptProposedAction();
    }
}

void MainWindow::chooseInput() {
    QString p = QFileDialog::getOpenFileName(this, m_decrypting ? "Chọn tệp .fcq hoặc bản mã" : "Chọn văn bản, ảnh, video hoặc tệp bất kỳ");
    if (!p.isEmpty()) setInputPath(p);
}

void MainWindow::chooseFolderInput() {
    QString p = QFileDialog::getExistingDirectory(this, "Chọn thư mục cần xử lý");
    if (!p.isEmpty()) setInputPath(p);
}

void MainWindow::chooseOutput() {
    QString p = m_folderMode
        ? QFileDialog::getExistingDirectory(this, "Chọn thư mục kết quả", QFileInfo(ui->outputEdit->text()).absolutePath())
        : QFileDialog::getSaveFileName(this, "Chọn tệp kết quả", ui->outputEdit->text());
    if (!p.isEmpty()) {
        ui->outputEdit->setText(p);
    }
}

void MainWindow::setInputPath(const QString& p) {
    m_folderMode = QFileInfo(p).isDir();
    ui->inputEdit->setText(p);
}

void MainWindow::updateInputType() {
    m_textMode = ui->textModeRadio->isChecked();
    ui->inputStack->setCurrentIndex(m_textMode ? 0 : 1);
    ui->outputStack->setCurrentIndex(m_textMode ? 0 : 1);
    ui->fileActionWidget->setVisible(!m_textMode);
}

void MainWindow::updateInput() {
    QString p = ui->inputEdit->text();
    QFileInfo f(p);
    if (!f.exists()) {
        m_folderMode = false;
        ui->fileInfoLabel->setText("Chưa chọn tệp hoặc thư mục");
        ui->sourcePreview->clearPreview();
        return;
    }
    m_folderMode = f.isDir();
    if (m_folderMode) {
        qint64 bytes = 0;
        int files = 0, fcq = 0;
        QDirIterator it(p, QDir::Files | QDir::NoDotAndDotDot, QDirIterator::Subdirectories);
        while (it.hasNext()) {
            QString x = it.next();
            ++files;
            bytes += QFileInfo(x).size();
            if (x.endsWith(".fcq", Qt::CaseInsensitive)) ++fcq;
        }
        ui->fileInfoLabel->setText(QString("[Thư mục] %1\n%2 tệp • %3 MB • %4 tệp FCQ").arg(f.fileName()).arg(files).arg(bytes / 1048576.0, 0, 'f', 2).arg(fcq));
        ui->sourcePreview->clearPreview(QString("THƯ MỤC NGUỒN\n\n%1 tệp sẽ được xử lý đệ quy\nGiữ nguyên cấu trúc thư mục con").arg(files));
        QString suffix = m_decrypting ? "_decrypted" : "_encrypted";
        ui->outputEdit->setText(QDir(f.absolutePath()).filePath(f.fileName() + suffix));
        return;
    }

    auto kind = FilePreview::classify(p);
    ui->fileInfoLabel->setText(QString("%1\n%2 • %3 MB").arg(f.fileName(), FilePreview::kindName(kind)).arg(f.size() / 1048576.0, 0, 'f', 2));
    ui->sourcePreview->showFile(p, kind == FilePreview::Kind::Encrypted);

    if (p.endsWith(".fcq", Qt::CaseInsensitive)) {
        ui->decryptMode->setChecked(true);
        try {
            auto info = CryptoEngine::inspectFile(p);
            ui->algorithmBox->setCurrentIndex(ui->algorithmBox->findData(int(info.algorithm)));
            ui->detailText->setPlainText(QString("Định dạng FCQ v%1\nThuật toán: %2\nTệp gốc: %3\nLoại: %4\nXác thực toàn vẹn: %5")
                                         .arg(info.version)
                                         .arg(CryptoEngine::algorithmName(info.algorithm), info.originalName, info.mimeType, info.authenticated ? "Có" : "Không (cũ)"));
        } catch (const std::exception& e) {
            ui->detailText->setPlainText(QString::fromStdString(e.what()));
        }
    }
    ui->outputEdit->setText(m_decrypting ? CryptoEngine::suggestedDecryptedPath(p) : CryptoEngine::suggestedEncryptedPath(p));
}

void MainWindow::updateMode() {
    m_decrypting = ui->decryptMode->isChecked();
    ui->algorithmBox->setEnabled(!m_decrypting);
    ui->runButton->setText(m_decrypting ? "BẮT ĐẦU GIẢI MÃ" : "BẮT ĐẦU MÃ HÓA");
    ui->sourcePreviewGroup->setTitle(m_decrypting ? "TỆP MÃ HÓA • HEX" : "TỆP GỐC • Xem trước");
    ui->resultPreviewGroup->setTitle(m_decrypting ? "NỘI DUNG KHÔI PHỤC • Xem trực tiếp" : "DỮ LIỆU MÃ HÓA • HEX");

    if (m_textMode) {
        if (m_decrypting) {
            ui->hexGroup->setTitle("DỮ LIỆU NHỊ PHÂN NGUỒN");
            ui->base64Group->setTitle("KẾT QUẢ VĂN BẢN ĐÃ GIẢI MÃ");
        } else {
            ui->hexGroup->setTitle("MÃ HEX (DỮ LIỆU NHỊ PHÂN SAU MÃ HÓA)");
            ui->base64Group->setTitle("CHUỖI BASE64 (DẠNG MÃ HÓA VĂN BẢN — CỜ -a)");
        }
    } else if (QFileInfo::exists(ui->inputEdit->text())) {
        if (m_folderMode) {
            QFileInfo f(ui->inputEdit->text());
            ui->outputEdit->setText(QDir(f.absolutePath()).filePath(f.fileName() + (m_decrypting ? "_decrypted" : "_encrypted")));
        } else {
            ui->outputEdit->setText(m_decrypting ? CryptoEngine::suggestedDecryptedPath(ui->inputEdit->text()) : CryptoEngine::suggestedEncryptedPath(ui->inputEdit->text()));
        }
    }
    updateAlgorithm();
}

QString MainWindow::algorithmExplanation() const {
    auto a = CryptoEngine::Algorithm(ui->algorithmBox->currentData().toInt());
    if (a == CryptoEngine::Algorithm::Aes256Gcm) {
        return "AES-256-GCM kết hợp mã hóa và xác thực AEAD. Nếu dữ liệu bản mã hoặc metadata bị sửa dù chỉ 1 bit, giải mã sẽ bị từ chối ngay lập tức.";
    }
    if (a == CryptoEngine::Algorithm::ChaCha20Poly1305) {
        return "ChaCha20-Poly1305 là mã dòng có xác thực, tốc độ rất cao trên CPU không có tập lệnh tăng tốc AES phần cứng và bảo vệ toàn vẹn tuyệt đối.";
    }
    return "AES-256-CBC mã hóa theo khối 128-bit với PKCS#7 padding. Trong bài học này, cờ -a xuất ra chuỗi Base64 giúp truyền dữ liệu an toàn trên kênh văn bản.";
}

void MainWindow::updateAlgorithm() {
    if (ui->algorithmBox->currentIndex() < 0) return;
    auto a = CryptoEngine::Algorithm(ui->algorithmBox->currentData().toInt());
    ui->algorithmInfo->setText(a == CryptoEngine::Algorithm::Aes256Gcm ? "[OK] AEAD GCM • Có xác thực • Khuyến nghị" :
                               a == CryptoEngine::Algorithm::ChaCha20Poly1305 ? "[OK] ChaCha20-Poly1305 • Hiệu năng cao" :
                               "[OK] AES-256-CBC • Chuẩn bài giảng OpenSSL");
    if (!m_decrypting) {
        ui->detailText->setPlainText(algorithmExplanation() + "\n\nKhóa và IV được dẫn xuất bằng hàm băm mật khẩu PBKDF2-HMAC-SHA256 kết hợp Salt ngẫu nhiên.");
    }
}


void MainWindow::setBusy(bool b) {
    ui->runButton->setDisabled(b);
    ui->inputButton->setDisabled(b);
    ui->folderButton->setDisabled(b);
    ui->outputButton->setDisabled(b);
    ui->encryptMode->setDisabled(b);
    ui->decryptMode->setDisabled(b);
    ui->textModeRadio->setDisabled(b);
    ui->fileModeRadio->setDisabled(b);
    ui->passwordEdit->setDisabled(b);
    ui->algorithmBox->setDisabled(b || m_decrypting);
    ui->loadingLabel->setVisible(b);
    if (b) m_loadingTimer->start();
    else m_loadingTimer->stop();
}

void MainWindow::run() {
    QString pass = ui->passwordEdit->text();
    if (pass.isEmpty()) {
        QMessageBox::warning(this, "Thiếu mật khẩu", "Vui lòng nhập mật khẩu.");
        return;
    }

    auto alg = CryptoEngine::Algorithm(ui->algorithmBox->currentData().toInt());

    // Case 1: Văn bản thuần (Text Mode)
    if (m_textMode) {
        QString text = ui->textInputEdit->toPlainText();
        if (text.trimmed().isEmpty()) {
            QMessageBox::warning(this, "Thiếu nội dung", "Vui lòng nhập văn bản hoặc dán bản mã.");
            return;
        }

        ui->progressBar->setValue(30);
        ui->transmissionWidget->start(m_decrypting, CryptoEngine::algorithmName(alg));

        if (!m_decrypting) {
            // Mã hóa văn bản
            auto res = CryptoEngine::encryptText(text, pass, alg, ui->base64Check->isChecked());
            if (!res.ok) {
                ui->progressBar->setValue(0);
                ui->transmissionWidget->finish(false);
                QMessageBox::warning(this, "Lỗi mã hóa", res.error);
                return;
            }
            ui->hexOutputEdit->setPlainText(res.hexString);
            ui->base64OutputEdit->setPlainText(res.base64String);
            ui->statusLabel->setText(QString("Mã hóa thành công • %1 bytes dữ liệu nhị phân").arg(res.rawCipher.size()));
            ui->detailText->setPlainText(QString("[OK] MÃ HÓA VĂN BẢN THÀNH CÔNG\n\n"
                                                 "1. Dữ liệu gốc: %1 ký tự UTF-8 (%2 bytes)\n"
                                                 "2. Chuỗi Hex (Binary Ciphertext): Hiển thị từng byte nhị phân thực tế sau khi qua thuật toán %3.\n"
                                                 "3. Chuỗi Base64 (-a): Bản mã nhị phân được mã hóa sang bảng chữ cái 64 ký tự ASCII an toàn để gửi qua email, JSON hoặc lưu trữ cơ sở dữ liệu.")
                                         .arg(text.length())
                                         .arg(text.toUtf8().size())
                                         .arg(CryptoEngine::algorithmName(alg)));
        } else {
            // Giải mã văn bản
            try {
                QString restored = CryptoEngine::decryptText(text, pass, alg);
                ui->hexOutputEdit->setPlainText(QString("Kích thước bản mã: %1 ký tự").arg(text.length()));
                ui->base64OutputEdit->setPlainText(restored);
                ui->statusLabel->setText("Giải mã văn bản thành công!");
                ui->detailText->setPlainText("[OK] GIẢI MÃ VĂN BẢN THÀNH CÔNG\n\nNội dung văn bản thuần (Plaintext) đã được khôi phục chính xác ở ô bên phải.");
            } catch (const std::exception& e) {
                ui->progressBar->setValue(0);
                ui->transmissionWidget->finish(false);
                QMessageBox::warning(this, "Lỗi giải mã", QString::fromStdString(e.what()));
                return;
            }
        }
        ui->progressBar->setValue(100);
        ui->transmissionWidget->finish(true);
        return;
    }

    // Case 2: Tệp tin hoặc thư mục (File Mode)
    QString in = ui->inputEdit->text(), out = ui->outputEdit->text();
    if (!QFileInfo::exists(in)) {
        QMessageBox::warning(this, "Thiếu nguồn", "Hãy chọn tệp hoặc thư mục nguồn.");
        return;
    }
    if (pass.size() < 6) {
        QMessageBox::warning(this, "Mật khẩu yếu", "Mật khẩu cho tệp nên có ít nhất 6 ký tự.");
        return;
    }
    if (out.isEmpty() || QFileInfo(in).absoluteFilePath() == QFileInfo(out).absoluteFilePath()) {
        QMessageBox::warning(this, "Đầu ra không hợp lệ", "Hãy chọn đường dẫn đầu ra khác nguồn.");
        return;
    }

    bool folder = m_folderMode;
    setBusy(true);
    ui->progressBar->setValue(0);
    ui->progressBar->setFormat("%p% — Đang xử lý");
    ui->resultPreview->clearPreview("Đang xử lý dữ liệu...");
    ui->transmissionWidget->start(m_decrypting, CryptoEngine::algorithmName(alg));
    ui->statusLabel->setText(folder ? "Đang xử lý thư mục và các thư mục con..."
                                    : (m_decrypting ? "Đang xác thực và giải mã..." : "Đang biến đổi dữ liệu thành bản mã..."));

    bool decrypting = m_decrypting;
    auto future = QtConcurrent::run([this, in, out, pass, alg, decrypting, folder] {
        QVariantMap r;
        try {
            CryptoEngine::Algorithm used = alg;
            if (!folder) {
                auto progress = [this](qint64 d, qint64 t) {
                    int v = t ? int(d * 100 / t) : 100;
                    QMetaObject::invokeMethod(this, [this, v] { ui->progressBar->setValue(v); }, Qt::QueuedConnection);
                };
                if (decrypting) used = CryptoEngine::decryptFile(in, out, pass, progress);
                else CryptoEngine::encryptFile(in, out, pass, alg, progress);
                r["count"] = 1;
            } else {
                QStringList files;
                QDirIterator it(in, QDir::Files | QDir::NoDotAndDotDot, QDirIterator::Subdirectories);
                while (it.hasNext()) {
                    QString p = it.next();
                    if (!decrypting || p.endsWith(".fcq", Qt::CaseInsensitive)) files << p;
                }
                if (files.isEmpty()) throw std::runtime_error(decrypting ? "Thư mục không có tệp .fcq để giải mã." : "Thư mục không có tệp để mã hóa.");
                QDir root(in);
                QDir().mkpath(out);
                int done = 0;
                for (const QString& src : files) {
                    QString rel = root.relativeFilePath(src), dest;
                    if (decrypting) {
                        auto info = CryptoEngine::inspectFile(src);
                        used = info.algorithm;
                        QString sub = QFileInfo(rel).path();
                        dest = QDir(out).filePath((sub == "." ? QString() : sub + "/") + QFileInfo(info.originalName).fileName());
                    } else dest = QDir(out).filePath(rel + ".fcq");
                    QDir().mkpath(QFileInfo(dest).absolutePath());
                    auto progress = [this, done, total = files.size()](qint64 d, qint64 t) {
                        int v = int(((double(done) + (t ? double(d) / t : 1.0)) / total) * 100);
                        QMetaObject::invokeMethod(this, [this, v] { ui->progressBar->setValue(v); }, Qt::QueuedConnection);
                    };
                    if (decrypting) CryptoEngine::decryptFile(src, dest, pass, progress);
                    else CryptoEngine::encryptFile(src, dest, pass, alg, progress);
                    ++done;
                }
                r["count"] = files.size();
            }
            r["ok"] = true;
            r["folder"] = folder;
            r["algorithm"] = folder ? (decrypting ? "Tự nhận theo từng tệp" : CryptoEngine::algorithmName(alg)) : CryptoEngine::algorithmName(used);
            r["output"] = out;
        } catch (const std::exception& e) {
            r["ok"] = false;
            r["error"] = QString::fromStdString(e.what());
        }
        return r;
    });
    m_watcher->setFuture(future);
}

void MainWindow::operationFinished() {
    QVariantMap r = m_watcher->result();
    bool ok = r["ok"].toBool();
    setBusy(false);
    ui->transmissionWidget->finish(ok);

    if (!ok) {
        ui->progressBar->setValue(0);
        ui->progressBar->setFormat("Lỗi xử lý");
        ui->statusLabel->setText("Thất bại: " + r["error"].toString());
        ui->resultPreview->clearPreview("Không tạo kết quả\n" + r["error"].toString());
        return;
    }

    QString out = r["output"].toString(), alg = r["algorithm"].toString();
    bool folder = r["folder"].toBool();
    int count = r["count"].toInt();
    ui->progressBar->setValue(100);
    ui->progressBar->setFormat(folder ? QString("100% — Đã xử lý %1 tệp").arg(count) : "100% — Đã xử lý toàn bộ tệp");
    ui->statusLabel->setText(QString("Hoàn tất • %1 • %2").arg(alg, QFileInfo(out).fileName()));

    if (folder) {
        ui->resultPreview->clearPreview(QString("[OK] HOÀN TẤT THƯ MỤC\n\nĐã %1 %2 tệp\n\n%3").arg(m_decrypting ? "giải mã" : "mã hóa").arg(count).arg(out));
    } else {
        ui->resultPreview->showFile(out, !m_decrypting);
    }

    ui->openResultButton->setEnabled(true);
    ui->openFolderButton->setEnabled(true);

    if (folder) {
        ui->detailText->setPlainText(QString("[OK] Đã %1 toàn bộ %2 tệp trong thư mục.\n\nNguồn: %3\nKết quả: %4").arg(m_decrypting ? "giải mã" : "mã hóa").arg(count).arg(ui->inputEdit->text(), out));
    } else {
        QString before = m_decrypting ? "Bản mã và thẻ xác thực" : "Toàn bộ nội dung gốc";
        QString after = m_decrypting ? "toàn bộ nội dung gốc đã được khôi phục" : "bản mã có entropy cao, không còn nhận ra cấu trúc ban đầu";
        ui->detailText->setPlainText(QString("[OK] %1\n\n%2 đã đi qua %3 và trở thành %4. Đã xử lý đủ %5 byte của tệp nguồn.")
                                     .arg(m_decrypting ? "Giải mã và xác thực thành công" : "Mã hóa và đóng gói thành công", before, alg, after)
                                     .arg(QFileInfo(ui->inputEdit->text()).size()));
    }
}

void MainWindow::openResult() {
    if (QFileInfo::exists(ui->outputEdit->text())) {
        QDesktopServices::openUrl(QUrl::fromLocalFile(ui->outputEdit->text()));
    }
}

void MainWindow::openFolder() {
    QFileInfo f(ui->outputEdit->text());
    QString path = f.isDir() ? f.absoluteFilePath() : f.absolutePath();
    if (QDir(path).exists()) {
        QDesktopServices::openUrl(QUrl::fromLocalFile(path));
    }
}

void MainWindow::copyHex() {
    QGuiApplication::clipboard()->setText(ui->hexOutputEdit->toPlainText());
    ui->statusLabel->setText("[OK] Đã sao chép chuỗi mã Hex vào bộ nhớ tạm!");
}

void MainWindow::copyBase64() {
    QGuiApplication::clipboard()->setText(ui->base64OutputEdit->toPlainText());
    ui->statusLabel->setText("[OK] Đã sao chép chuỗi Base64 vào bộ nhớ tạm!");
}


// -------------------------------------------------------------
// TAB 2: TẠO CSR & CẶP KHÓA
// -------------------------------------------------------------
void MainWindow::generateCsr() {
    CsrEngine::SubjectInfo subj;
    subj.commonName = ui->csrCnEdit->text();
    subj.organization = ui->csrOEdit->text();
    subj.organizationalUnit = ui->csrOuEdit->text();
    subj.country = ui->csrCEdit->text();
    subj.state = ui->csrStEdit->text();
    subj.locality = ui->csrLEdit->text();
    subj.email = ui->csrEmailEdit->text();

    auto keyType = CsrEngine::KeyType(ui->csrKeyTypeCombo->currentData().toInt());
    auto digest = CsrEngine::DigestType(ui->csrDigestCombo->currentData().toInt());

    ui->csrStatusLabel->setText("Đang sinh cặp khóa ngẫu nhiên và ký số CSR...");
    qApp->processEvents();

    auto res = CsrEngine::generate(subj, keyType, digest);
    if (!res.success) {
        ui->csrStatusLabel->setText("Thất bại: " + res.error);
        QMessageBox::warning(this, "Lỗi tạo CSR", res.error);
        return;
    }

    ui->csrKeyEdit->setPlainText(res.privateKeyPem);
    ui->csrOutputEdit->setPlainText(res.csrPem);
    ui->csrDetailsEdit->setPlainText(res.textDetails);

    ui->csrSaveKeyButton->setEnabled(true);
    ui->csrSaveCsrButton->setEnabled(true);
    ui->csrStatusLabel->setText("[OK] Sinh cặp khóa và tạo CSR thành công!");
}

void MainWindow::savePrivateKey() {
    QString p = QFileDialog::getSaveFileName(this, "Lưu Khóa Bí Mật", QDir::homePath() + "/private.key", "Private Key (*.key *.pem)");
    if (!p.isEmpty()) {
        QFile f(p);
        if (f.open(QIODevice::WriteOnly | QIODevice::Text)) {
            f.write(ui->csrKeyEdit->toPlainText().toUtf8());
            ui->csrStatusLabel->setText("[OK] Đã lưu Private Key vào: " + QFileInfo(p).fileName());
        }
    }
}

void MainWindow::saveCsr() {
    QString p = QFileDialog::getSaveFileName(this, "Lưu Yêu Cầu Chứng Chỉ CSR", QDir::homePath() + "/request.csr", "Certificate Request (*.csr *.pem)");
    if (!p.isEmpty()) {
        QFile f(p);
        if (f.open(QIODevice::WriteOnly | QIODevice::Text)) {
            f.write(ui->csrOutputEdit->toPlainText().toUtf8());
            ui->csrStatusLabel->setText("[OK] Đã lưu CSR vào: " + QFileInfo(p).fileName());
        }
    }
}

void MainWindow::copyPrivateKey() {
    QGuiApplication::clipboard()->setText(ui->csrKeyEdit->toPlainText());
    ui->csrStatusLabel->setText("[OK] Đã sao chép Private Key vào bộ nhớ tạm!");
}

void MainWindow::copyCsr() {
    QGuiApplication::clipboard()->setText(ui->csrOutputEdit->toPlainText());
    ui->csrStatusLabel->setText("[OK] Đã sao chép CSR vào bộ nhớ tạm!");
}


