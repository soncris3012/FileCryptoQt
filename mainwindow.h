#pragma once
#include <QMainWindow>
QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
QT_END_NAMESPACE
class QDragEnterEvent;
class QDropEvent;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;
protected:
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dropEvent(QDropEvent *event) override;
private slots:
    void chooseInput();
    void chooseOutput();
    void encrypt();
    void decrypt();
    void updateSuggestion();
    void openResult();
    void openResultFolder();
private:
    void run(bool decrypting);
    void setBusy(bool busy);
    Ui::MainWindow *ui;
};
