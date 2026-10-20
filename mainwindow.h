#pragma once

#include <QMainWindow>
#include <QVariantMap>

QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
class QDragEnterEvent;
class QDropEvent;
class QTimer;
QT_END_NAMESPACE

template<class T> class QFutureWatcher;

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

protected:
    void dragEnterEvent(QDragEnterEvent *e) override;
    void dropEvent(QDropEvent *e) override;

private slots:
    // Tab 1 Slots (Mã hóa / Giải mã)
    void chooseInput();
    void chooseFolderInput();
    void chooseOutput();
    void updateInput();
    void updateMode();
    void updateInputType();
    void updateAlgorithm();
    void run();
    void operationFinished();
    void openResult();
    void openFolder();
    void copyHex();
    void copyBase64();

    // Tab 2 Slots (Tạo CSR)
    void generateCsr();
    void savePrivateKey();
    void saveCsr();
    void copyPrivateKey();
    void copyCsr();

private:
    void setBusy(bool busy);
    void setInputPath(const QString &path);
    QString algorithmExplanation() const;

    Ui::MainWindow *ui;
    QFutureWatcher<QVariantMap> *m_watcher;
    QTimer *m_loadingTimer;
    int m_loadingFrame = 0;
    bool m_decrypting = false;
    bool m_folderMode = false;
    bool m_textMode = true;
};
