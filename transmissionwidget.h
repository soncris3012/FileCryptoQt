#pragma once
#include <QWidget>
class QTimer;
class TransmissionWidget : public QWidget{
    Q_OBJECT
public:
    explicit TransmissionWidget(QWidget *parent=nullptr);
    void start(bool decrypting,const QString &algorithm);
    void finish(bool success);
protected:void paintEvent(QPaintEvent*)override;
private:QTimer *m_timer{};qreal m_phase=0;bool m_running=false,m_decrypting=false,m_success=false;QString m_algorithm="Thuật toán";
};
