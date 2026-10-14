#pragma once
#include <QWidget>
class QLabel; class QPlainTextEdit; class QStackedWidget; class QMediaPlayer; class QVideoWidget; class QPushButton; class QAudioOutput;

class FilePreview : public QWidget {
    Q_OBJECT
public:
    enum class Kind { Text, Image, Video, Binary, Encrypted };
    explicit FilePreview(QWidget *parent=nullptr);
    static Kind classify(const QString &path);
    static QString kindName(Kind kind);
    void showFile(const QString &path, bool encrypted=false);
    void clearPreview(const QString &message="Chọn tệp để xem trước");
private:
    QStackedWidget *m_stack{}; QLabel *m_empty{}; QLabel *m_image{}; QPlainTextEdit *m_text{};
    QPlainTextEdit *m_hex{}; QVideoWidget *m_video{}; QMediaPlayer *m_player{}; QAudioOutput *m_audio{};
    QPushButton *m_play{}; QString m_currentPath;
};
