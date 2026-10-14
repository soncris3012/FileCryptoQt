/********************************************************************************
** Form generated from reading UI file 'mainwindow.ui'
**
** Created by: Qt User Interface Compiler version 6.11.1
**
** WARNING! All changes made in this file will be lost when recompiling UI file!
********************************************************************************/

#ifndef UI_MAINWINDOW_H
#define UI_MAINWINDOW_H

#include <QtCore/QVariant>
#include <QtWidgets/QApplication>
#include <QtWidgets/QComboBox>
#include <QtWidgets/QFormLayout>
#include <QtWidgets/QFrame>
#include <QtWidgets/QHBoxLayout>
#include <QtWidgets/QLabel>
#include <QtWidgets/QLineEdit>
#include <QtWidgets/QMainWindow>
#include <QtWidgets/QPlainTextEdit>
#include <QtWidgets/QProgressBar>
#include <QtWidgets/QPushButton>
#include <QtWidgets/QSpacerItem>
#include <QtWidgets/QVBoxLayout>
#include <QtWidgets/QWidget>

QT_BEGIN_NAMESPACE

class Ui_MainWindow
{
public:
    QWidget *centralwidget;
    QVBoxLayout *mainLayout;
    QLabel *titleLabel;
    QLabel *subtitleLabel;
    QFrame *cardFrame;
    QFormLayout *formLayout;
    QLabel *inputLabel;
    QHBoxLayout *inputLayout;
    QLineEdit *inputEdit;
    QPushButton *inputButton;
    QLabel *outputLabel;
    QHBoxLayout *outputLayout;
    QLineEdit *outputEdit;
    QPushButton *outputButton;
    QLabel *algorithmLabel;
    QComboBox *algorithmBox;
    QLabel *passwordLabel;
    QLineEdit *passwordEdit;
    QLabel *fileInfoLabel;
    QProgressBar *progressBar;
    QHBoxLayout *actionLayout;
    QPushButton *encryptButton;
    QPushButton *decryptButton;
    QSpacerItem *actionSpacer;
    QLabel *statusLabel;
    QLabel *resultTitleLabel;
    QPlainTextEdit *resultPreview;
    QHBoxLayout *resultActionLayout;
    QPushButton *openResultButton;
    QPushButton *openFolderButton;
    QSpacerItem *resultSpacer;

    void setupUi(QMainWindow *MainWindow)
    {
        if (MainWindow->objectName().isEmpty())
            MainWindow->setObjectName("MainWindow");
        MainWindow->resize(820, 700);
        MainWindow->setStyleSheet(QString::fromUtf8("QMainWindow,QWidget{background:#f4f7fb;color:#172033;font-size:14px} QLabel#titleLabel{font-size:27px;font-weight:800;color:#173b72} QLabel#subtitleLabel,QLabel#fileInfoLabel,QLabel#statusLabel{color:#61708a} QLabel#resultTitleLabel{color:#173b72;font-weight:800} QFrame#cardFrame{background:white;border:1px solid #dce5f2;border-radius:14px} QLineEdit,QComboBox{background:#f9fbfe;border:1px solid #cbd7e7;border-radius:7px;padding:9px} QLineEdit:focus,QComboBox:focus{border:1px solid #3578d4} QPushButton{background:#e8eef7;border:none;border-radius:7px;padding:10px 18px;font-weight:600} QPushButton:hover{background:#d9e4f3} QPushButton#encryptButton{background:#2167c8;color:white} QPushButton#encryptButton:hover{background:#1859b2} QPushButton:disabled{color:#8793a7;background:#e8edf4} QProgressBar{border:none;border-radius:5px;background:#dfe7f2;height:10px;text-align:center} QProgressBar::chunk{border-radius:5px;background:#31a56a} QPlainTextEdit{background:#101827;color:#a8f0c6;border:1px solid #26364d;border"
                        "-radius:8px;padding:10px;font-family:Menlo,Monaco,monospace}"));
        centralwidget = new QWidget(MainWindow);
        centralwidget->setObjectName("centralwidget");
        mainLayout = new QVBoxLayout(centralwidget);
        mainLayout->setSpacing(14);
        mainLayout->setObjectName("mainLayout");
        mainLayout->setContentsMargins(32, 28, 32, 28);
        titleLabel = new QLabel(centralwidget);
        titleLabel->setObjectName("titleLabel");

        mainLayout->addWidget(titleLabel);

        subtitleLabel = new QLabel(centralwidget);
        subtitleLabel->setObjectName("subtitleLabel");

        mainLayout->addWidget(subtitleLabel);

        cardFrame = new QFrame(centralwidget);
        cardFrame->setObjectName("cardFrame");
        formLayout = new QFormLayout(cardFrame);
        formLayout->setObjectName("formLayout");
        formLayout->setHorizontalSpacing(16);
        formLayout->setVerticalSpacing(16);
        formLayout->setContentsMargins(24, 24, 24, 24);
        inputLabel = new QLabel(cardFrame);
        inputLabel->setObjectName("inputLabel");

        formLayout->setWidget(0, QFormLayout::ItemRole::LabelRole, inputLabel);

        inputLayout = new QHBoxLayout();
        inputLayout->setObjectName("inputLayout");
        inputEdit = new QLineEdit(cardFrame);
        inputEdit->setObjectName("inputEdit");

        inputLayout->addWidget(inputEdit);

        inputButton = new QPushButton(cardFrame);
        inputButton->setObjectName("inputButton");

        inputLayout->addWidget(inputButton);


        formLayout->setLayout(0, QFormLayout::ItemRole::FieldRole, inputLayout);

        outputLabel = new QLabel(cardFrame);
        outputLabel->setObjectName("outputLabel");

        formLayout->setWidget(1, QFormLayout::ItemRole::LabelRole, outputLabel);

        outputLayout = new QHBoxLayout();
        outputLayout->setObjectName("outputLayout");
        outputEdit = new QLineEdit(cardFrame);
        outputEdit->setObjectName("outputEdit");

        outputLayout->addWidget(outputEdit);

        outputButton = new QPushButton(cardFrame);
        outputButton->setObjectName("outputButton");

        outputLayout->addWidget(outputButton);


        formLayout->setLayout(1, QFormLayout::ItemRole::FieldRole, outputLayout);

        algorithmLabel = new QLabel(cardFrame);
        algorithmLabel->setObjectName("algorithmLabel");

        formLayout->setWidget(2, QFormLayout::ItemRole::LabelRole, algorithmLabel);

        algorithmBox = new QComboBox(cardFrame);
        algorithmBox->setObjectName("algorithmBox");

        formLayout->setWidget(2, QFormLayout::ItemRole::FieldRole, algorithmBox);

        passwordLabel = new QLabel(cardFrame);
        passwordLabel->setObjectName("passwordLabel");

        formLayout->setWidget(3, QFormLayout::ItemRole::LabelRole, passwordLabel);

        passwordEdit = new QLineEdit(cardFrame);
        passwordEdit->setObjectName("passwordEdit");
        passwordEdit->setEchoMode(QLineEdit::EchoMode::Password);

        formLayout->setWidget(3, QFormLayout::ItemRole::FieldRole, passwordEdit);


        mainLayout->addWidget(cardFrame);

        fileInfoLabel = new QLabel(centralwidget);
        fileInfoLabel->setObjectName("fileInfoLabel");

        mainLayout->addWidget(fileInfoLabel);

        progressBar = new QProgressBar(centralwidget);
        progressBar->setObjectName("progressBar");
        progressBar->setValue(0);

        mainLayout->addWidget(progressBar);

        actionLayout = new QHBoxLayout();
        actionLayout->setObjectName("actionLayout");
        encryptButton = new QPushButton(centralwidget);
        encryptButton->setObjectName("encryptButton");

        actionLayout->addWidget(encryptButton);

        decryptButton = new QPushButton(centralwidget);
        decryptButton->setObjectName("decryptButton");

        actionLayout->addWidget(decryptButton);

        actionSpacer = new QSpacerItem(40, 20, QSizePolicy::Policy::Expanding, QSizePolicy::Policy::Minimum);

        actionLayout->addItem(actionSpacer);

        statusLabel = new QLabel(centralwidget);
        statusLabel->setObjectName("statusLabel");

        actionLayout->addWidget(statusLabel);


        mainLayout->addLayout(actionLayout);

        resultTitleLabel = new QLabel(centralwidget);
        resultTitleLabel->setObjectName("resultTitleLabel");

        mainLayout->addWidget(resultTitleLabel);

        resultPreview = new QPlainTextEdit(centralwidget);
        resultPreview->setObjectName("resultPreview");
        resultPreview->setMinimumSize(QSize(0, 150));
        resultPreview->setReadOnly(true);

        mainLayout->addWidget(resultPreview);

        resultActionLayout = new QHBoxLayout();
        resultActionLayout->setObjectName("resultActionLayout");
        openResultButton = new QPushButton(centralwidget);
        openResultButton->setObjectName("openResultButton");
        openResultButton->setEnabled(false);

        resultActionLayout->addWidget(openResultButton);

        openFolderButton = new QPushButton(centralwidget);
        openFolderButton->setObjectName("openFolderButton");
        openFolderButton->setEnabled(false);

        resultActionLayout->addWidget(openFolderButton);

        resultSpacer = new QSpacerItem(40, 20, QSizePolicy::Policy::Expanding, QSizePolicy::Policy::Minimum);

        resultActionLayout->addItem(resultSpacer);


        mainLayout->addLayout(resultActionLayout);

        MainWindow->setCentralWidget(centralwidget);

        retranslateUi(MainWindow);

        QMetaObject::connectSlotsByName(MainWindow);
    } // setupUi

    void retranslateUi(QMainWindow *MainWindow)
    {
        MainWindow->setWindowTitle(QCoreApplication::translate("MainWindow", "FileCrypto Qt \342\200\224 M\303\243 h\303\263a t\341\273\207p", nullptr));
        titleLabel->setText(QCoreApplication::translate("MainWindow", "M\303\203 H\303\223A T\341\273\206P AN TO\303\200N", nullptr));
        subtitleLabel->setText(QCoreApplication::translate("MainWindow", "K\303\251o th\341\272\243 t\341\273\207p v\303\240o c\341\273\255a s\341\273\225 ho\341\272\267c ch\341\273\215n t\341\273\207p \304\221\341\273\203 m\303\243 h\303\263a v\304\203n b\341\272\243n, h\303\254nh \341\272\243nh v\303\240 video.", nullptr));
        inputLabel->setText(QCoreApplication::translate("MainWindow", "T\341\273\207p ngu\341\273\223n", nullptr));
        inputEdit->setPlaceholderText(QCoreApplication::translate("MainWindow", "Ch\341\273\215n ho\341\272\267c k\303\251o th\341\272\243 t\341\273\207p v\303\240o \304\221\303\242y...", nullptr));
        inputButton->setText(QCoreApplication::translate("MainWindow", "M\341\273\237 t\341\273\207p", nullptr));
        outputLabel->setText(QCoreApplication::translate("MainWindow", "T\341\273\207p k\341\272\277t qu\341\272\243", nullptr));
        outputButton->setText(QCoreApplication::translate("MainWindow", "Ch\341\273\215n n\306\241i l\306\260u", nullptr));
        algorithmLabel->setText(QCoreApplication::translate("MainWindow", "Thu\341\272\255t to\303\241n", nullptr));
        passwordLabel->setText(QCoreApplication::translate("MainWindow", "M\341\272\255t kh\341\272\251u", nullptr));
        passwordEdit->setPlaceholderText(QCoreApplication::translate("MainWindow", "Nh\341\272\255p m\341\272\255t kh\341\272\251u (t\341\273\221i thi\341\273\203u 8 k\303\275 t\341\273\261)", nullptr));
        fileInfoLabel->setText(QCoreApplication::translate("MainWindow", "Ch\306\260a ch\341\273\215n t\341\273\207p \342\200\224 c\303\263 th\341\273\203 k\303\251o th\341\272\243 t\341\273\207p v\303\240o c\341\273\255a s\341\273\225", nullptr));
        encryptButton->setText(QCoreApplication::translate("MainWindow", "M\303\243 h\303\263a", nullptr));
        decryptButton->setText(QCoreApplication::translate("MainWindow", "Gi\341\272\243i m\303\243", nullptr));
        statusLabel->setText(QCoreApplication::translate("MainWindow", "S\341\272\265n s\303\240ng", nullptr));
        resultTitleLabel->setText(QCoreApplication::translate("MainWindow", "K\341\272\276T QU\341\272\242", nullptr));
        resultPreview->setPlaceholderText(QCoreApplication::translate("MainWindow", "D\341\273\257 li\341\273\207u m\303\243 h\303\263a d\341\272\241ng HEX ho\341\272\267c n\341\273\231i dung v\304\203n b\341\272\243n gi\341\272\243i m\303\243 s\341\272\275 hi\341\273\203n th\341\273\213 t\341\272\241i \304\221\303\242y.", nullptr));
        openResultButton->setText(QCoreApplication::translate("MainWindow", "M\341\273\237 t\341\273\207p k\341\272\277t qu\341\272\243", nullptr));
        openFolderButton->setText(QCoreApplication::translate("MainWindow", "M\341\273\237 th\306\260 m\341\273\245c ch\341\273\251a", nullptr));
    } // retranslateUi

};

namespace Ui {
    class MainWindow: public Ui_MainWindow {};
} // namespace Ui

QT_END_NAMESPACE

#endif // UI_MAINWINDOW_H
