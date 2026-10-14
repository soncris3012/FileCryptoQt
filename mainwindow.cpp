#include "mainwindow.h"
#include "ui_mainwindow.h"
#include "cryptoengine.h"
#include <QApplication>
#include <QDesktopServices>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QFile>
#include <QFileDialog>
#include <QFileInfo>
#include <QMessageBox>
#include <QMimeData>
#include <QUrl>

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent), ui(new Ui::MainWindow) {
    ui->setupUi(this);
    setAcceptDrops(true);
    ui->algorithmBox->addItem("AES-256-CBC", int(CryptoEngine::Algorithm::Aes256Cbc));
    ui->algorithmBox->addItem("AES-256-GCM", int(CryptoEngine::Algorithm::Aes256Gcm));
    ui->algorithmBox->addItem("ChaCha20-Poly1305", int(CryptoEngine::Algorithm::ChaCha20Poly1305));
    ui->algorithmBox->setCurrentIndex(1);
    connect(ui->inputButton, &QPushButton::clicked, this, &MainWindow::chooseInput);
    connect(ui->outputButton, &QPushButton::clicked, this, &MainWindow::chooseOutput);
    connect(ui->encryptButton, &QPushButton::clicked, this, &MainWindow::encrypt);
    connect(ui->decryptButton, &QPushButton::clicked, this, &MainWindow::decrypt);
    connect(ui->inputEdit, &QLineEdit::textChanged, this, &MainWindow::updateSuggestion);
    connect(ui->openResultButton, &QPushButton::clicked, this, &MainWindow::openResult);
    connect(ui->openFolderButton, &QPushButton::clicked, this, &MainWindow::openResultFolder);
}
MainWindow::~MainWindow() { delete ui; }

void MainWindow::dragEnterEvent(QDragEnterEvent *event) {
    if (event->mimeData()->hasUrls() && !event->mimeData()->urls().isEmpty()
        && event->mimeData()->urls().first().isLocalFile()) event->acceptProposedAction();
}
void MainWindow::dropEvent(QDropEvent *event) {
    const auto urls = event->mimeData()->urls();
    if (!urls.isEmpty() && QFileInfo(urls.first().toLocalFile()).isFile()) {
        ui->inputEdit->setText(urls.first().toLocalFile());
        event->acceptProposedAction();
    }
}
void MainWindow::chooseInput() {
    const QString path = QFileDialog::getOpenFileName(this, "Chọn tệp cần xử lý");
    if (!path.isEmpty()) ui->inputEdit->setText(path);
}
void MainWindow::chooseOutput() {
    const QString path = QFileDialog::getSaveFileName(this, "Chọn tệp kết quả", ui->outputEdit->text());
    if (!path.isEmpty()) ui->outputEdit->setText(path);
}
void MainWindow::updateSuggestion() {
    const QFileInfo info(ui->inputEdit->text());
    if (!info.exists()) { ui->fileInfoLabel->setText("Chưa chọn tệp — có thể kéo thả tệp vào cửa sổ"); return; }
    ui->fileInfoLabel->setText(QString("%1  •  %2 MB").arg(info.fileName()).arg(info.size()/1048576.0, 0, 'f', 2));
    ui->outputEdit->setText(ui->inputEdit->text().endsWith(".fcq", Qt::CaseInsensitive)
        ? CryptoEngine::suggestedDecryptedPath(ui->inputEdit->text())
        : CryptoEngine::suggestedEncryptedPath(ui->inputEdit->text()));
}
void MainWindow::encrypt() { run(false); }
void MainWindow::decrypt() { run(true); }
void MainWindow::openResult() {
    if (QFileInfo::exists(ui->outputEdit->text())) QDesktopServices::openUrl(QUrl::fromLocalFile(ui->outputEdit->text()));
}
void MainWindow::openResultFolder() {
    const QFileInfo info(ui->outputEdit->text());
    if (info.dir().exists()) QDesktopServices::openUrl(QUrl::fromLocalFile(info.absolutePath()));
}
void MainWindow::setBusy(bool busy) {
    ui->encryptButton->setDisabled(busy); ui->decryptButton->setDisabled(busy);
    ui->inputEdit->setDisabled(busy); ui->outputEdit->setDisabled(busy);
    ui->passwordEdit->setDisabled(busy); ui->algorithmBox->setDisabled(busy);
}
void MainWindow::run(bool decrypting) {
    if (!QFileInfo::exists(ui->inputEdit->text())) { QMessageBox::warning(this,"Thiếu tệp","Vui lòng chọn hoặc kéo thả tệp nguồn vào cửa sổ."); return; }
    if (ui->outputEdit->text().trimmed().isEmpty()) { QMessageBox::warning(this,"Thiếu đầu ra","Vui lòng chọn nơi lưu tệp kết quả."); return; }
    if (ui->passwordEdit->text().size() < 8) { QMessageBox::warning(this,"Mật khẩu yếu","Mật khẩu cần có ít nhất 8 ký tự."); return; }
    if (QFileInfo(ui->inputEdit->text()).absoluteFilePath()==QFileInfo(ui->outputEdit->text()).absoluteFilePath()) { QMessageBox::warning(this,"Đường dẫn không hợp lệ","Tệp nguồn và tệp kết quả phải khác nhau."); return; }
    setBusy(true); ui->progressBar->setValue(0); ui->resultPreview->clear();
    ui->openResultButton->setEnabled(false); ui->openFolderButton->setEnabled(false);
    ui->statusLabel->setText(decrypting ? "Đang giải mã..." : "Đang mã hóa..."); QApplication::processEvents();
    try {
        auto progress=[this](qint64 done,qint64 total){ ui->progressBar->setValue(total>0?int(done*100/total):100); QApplication::processEvents(); };
        QString algorithm;
        if (decrypting) algorithm=CryptoEngine::algorithmName(CryptoEngine::decryptFile(ui->inputEdit->text(),ui->outputEdit->text(),ui->passwordEdit->text(),progress));
        else {
            auto selected=CryptoEngine::Algorithm(ui->algorithmBox->currentData().toInt());
            CryptoEngine::encryptFile(ui->inputEdit->text(),ui->outputEdit->text(),ui->passwordEdit->text(),selected,progress);
            algorithm=CryptoEngine::algorithmName(selected);
        }
        ui->progressBar->setValue(100); ui->statusLabel->setText("Hoàn tất");
        QFile result(ui->outputEdit->text());
        if (result.open(QIODevice::ReadOnly)) {
            QByteArray preview=result.read(4096);
            if (decrypting) {
                QString text=QString::fromUtf8(preview);
                if (!text.isEmpty() && text.count(QChar::ReplacementCharacter)<text.size()/20)
                    ui->resultPreview->setPlainText(text+(result.size()>preview.size()?"\n\n… (chỉ hiển thị 4 KB đầu)":""));
                else ui->resultPreview->setPlainText(QString("Đã giải mã tệp nhị phân thành công.\nKích thước: %1 byte\n\nHEX (4 KB đầu):\n%2").arg(result.size()).arg(QString::fromLatin1(preview.toHex(' '))));
            } else ui->resultPreview->setPlainText(QString("Thuật toán: %1\nKích thước: %2 byte\nĐường dẫn: %3\n\nHEX (4 KB đầu):\n%4%5").arg(algorithm).arg(result.size()).arg(ui->outputEdit->text()).arg(QString::fromLatin1(preview.toHex(' '))).arg(result.size()>preview.size()?"\n\n… (chỉ hiển thị 4 KB đầu)":""));
        }
        ui->openResultButton->setEnabled(true); ui->openFolderButton->setEnabled(true);
        QMessageBox::information(this,"Thành công",QString("%1 thành công bằng %2.\n\nKết quả: %3").arg(decrypting?"Giải mã":"Mã hóa",algorithm,ui->outputEdit->text()));
    } catch (const std::exception &e) {
        ui->progressBar->setValue(0); ui->statusLabel->setText("Có lỗi");
        QMessageBox::critical(this,"Không thể xử lý",QString::fromStdString(e.what()));
    }
    setBusy(false);
}
