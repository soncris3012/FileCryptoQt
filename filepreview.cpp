#include "filepreview.h"
#include <QAudioOutput>
#include <QFile>
#include <QFileInfo>
#include <QHBoxLayout>
#include <QImageReader>
#include <QLabel>
#include <QMediaPlayer>
#include <QMimeDatabase>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QStackedWidget>
#include <QUrl>
#include <QVBoxLayout>
#include <QVideoWidget>

FilePreview::FilePreview(QWidget *parent):QWidget(parent){
    auto *root=new QVBoxLayout(this); root->setContentsMargins(0,0,0,0);
    m_stack=new QStackedWidget; root->addWidget(m_stack);
    m_empty=new QLabel("Chọn tệp để xem trước");m_empty->setAlignment(Qt::AlignCenter);m_empty->setWordWrap(true);m_empty->setObjectName("emptyPreview");m_stack->addWidget(m_empty);
    m_text=new QPlainTextEdit;m_text->setReadOnly(true);m_text->setObjectName("textPreview");m_stack->addWidget(m_text);
    m_image=new QLabel;m_image->setAlignment(Qt::AlignCenter);m_image->setMinimumSize(320,240);m_image->setScaledContents(false);m_image->setObjectName("imagePreview");m_stack->addWidget(m_image);
    auto *videoPage=new QWidget;auto *vl=new QVBoxLayout(videoPage);m_video=new QVideoWidget;vl->addWidget(m_video,1);m_play=new QPushButton("▶ Phát / Tạm dừng");vl->addWidget(m_play);m_stack->addWidget(videoPage);
    m_player=new QMediaPlayer(this);m_audio=new QAudioOutput(this);m_player->setVideoOutput(m_video);m_player->setAudioOutput(m_audio);
    connect(m_play,&QPushButton::clicked,this,[this]{m_player->playbackState()==QMediaPlayer::PlayingState?m_player->pause():m_player->play();});
    m_hex=new QPlainTextEdit;m_hex->setReadOnly(true);m_hex->setObjectName("hexPreview");m_stack->addWidget(m_hex);
}
FilePreview::Kind FilePreview::classify(const QString &path){
    if(path.endsWith(".fcq",Qt::CaseInsensitive))return Kind::Encrypted;
    const QString mime=QMimeDatabase().mimeTypeForFile(path,QMimeDatabase::MatchContent).name();
    if(mime.startsWith("text/")||mime.contains("json")||mime.contains("xml"))return Kind::Text;
    if(mime.startsWith("image/"))return Kind::Image;
    if(mime.startsWith("video/")||mime.startsWith("audio/"))return Kind::Video;
    return Kind::Binary;
}
QString FilePreview::kindName(Kind k){switch(k){case Kind::Text:return"Văn bản";case Kind::Image:return"Hình ảnh";case Kind::Video:return"Video / âm thanh";case Kind::Encrypted:return"Tệp mã hóa";default:return"Tệp nhị phân";}}
void FilePreview::clearPreview(const QString &message){m_player->stop();m_empty->setText(message);m_stack->setCurrentWidget(m_empty);}
void FilePreview::showFile(const QString &path,bool encrypted){
    m_currentPath=path;m_player->stop();QFileInfo info(path);if(!info.exists()){clearPreview("Không tìm thấy tệp");return;}
    Kind kind=encrypted?Kind::Encrypted:classify(path);
    if(kind==Kind::Text){QFile f(path);if(f.open(QIODevice::ReadOnly)){m_text->setPlainText(QString::fromUtf8(f.read(1024*1024)));m_stack->setCurrentWidget(m_text);return;}}
    if(kind==Kind::Image){QPixmap px(path);if(!px.isNull()){m_image->setPixmap(px.scaled(900,560,Qt::KeepAspectRatio,Qt::SmoothTransformation));m_stack->setCurrentWidget(m_image);return;}}
    if(kind==Kind::Video){m_player->setSource(QUrl::fromLocalFile(path));m_stack->setCurrentIndex(3);return;}
    QFile f(path);if(f.open(QIODevice::ReadOnly)){QByteArray d=f.read(8192);QString title=encrypted?"✓ TOÀN BỘ TỆP ĐÃ ĐƯỢC MÃ HÓA":"XEM TRƯỚC HEX";QString note=info.size()>d.size()?(encrypted?"\n\nTệp đã được mã hóa toàn bộ "+QString::number(info.size())+" byte. Vùng này chỉ xem trước 8 KB HEX đầu để giao diện không bị chậm.":"\n\nTệp được xử lý toàn bộ; vùng xem trước chỉ đọc 8 KB đầu."):"";m_hex->setPlainText(QString("%1\n%2 | Tổng kích thước: %3 byte\n\n%4%5").arg(title,info.fileName()).arg(info.size()).arg(QString::fromLatin1(d.toHex(' '))).arg(note));m_stack->setCurrentWidget(m_hex);return;}
    clearPreview("Không thể đọc tệp");
}
