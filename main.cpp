#include "mainwindow.h"
#include <QApplication>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QApplication::setApplicationName("Mã hóa tệp an toàn");
    QApplication::setOrganizationName("NCKH2627");
    MainWindow window;
    window.show();
    return app.exec();
}

