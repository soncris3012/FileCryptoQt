#pragma once
#include <QMainWindow>
#include <QVariantMap>
QT_BEGIN_NAMESPACE
namespace Ui{class MainWindow;}class QDragEnterEvent;class QDropEvent;class QFutureWatcherBase;class QTimer;
QT_END_NAMESPACE
template<class T> class QFutureWatcher;

class MainWindow:public QMainWindow{
    Q_OBJECT
public:explicit MainWindow(QWidget *parent=nullptr);~MainWindow()override;
protected:void dragEnterEvent(QDragEnterEvent*)override;void dropEvent(QDropEvent*)override;
private slots:void chooseInput();void chooseOutput();void updateInput();void updateMode();void updateAlgorithm();void run();void operationFinished();void openResult();void openFolder();
private:void setBusy(bool);void setInputPath(const QString&);QString algorithmExplanation()const;
    Ui::MainWindow *ui;QFutureWatcher<QVariantMap>*m_watcher;QTimer*m_loadingTimer;int m_loadingFrame=0;bool m_decrypting=false;
};
