//
//  DecryptView.swift
//  FileCrypto iOS
//

import SwiftUI
import UniformTypeIdentifiers

public struct DecryptView: View {
    @ObservedObject var vm: CryptoViewModel
    @State private var isShowingFilePicker = false

    public init(vm: CryptoViewModel) {
        self.vm = vm
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // 1. File Selection Card
                VStack(alignment: .leading, spacing: 12) {
                    Label("Chọn tệp mã hóa .fcq", systemImage: "lock.doc.fill")
                        .font(.headline)

                    if let data = vm.selectedFileData {
                        HStack(spacing: 12) {
                            Image(systemName: "lock.shield.fill")
                                .font(.system(size: 28))
                                .foregroundColor(.green)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(vm.selectedFileName)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .lineLimit(1)

                                Text("\(formatBytes(data.count)) • Tệp FileCrypto")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Button {
                                vm.clearFile()
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.red)
                                    .font(.title3)
                            }
                        }
                        .padding(12)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.green.opacity(0.3), lineWidth: 1)
                        )
                    } else {
                        Button {
                            isShowingFilePicker = true
                        } label: {
                            VStack(spacing: 8) {
                                Image(systemName: "lock.open.trianglebadge.exclamationmark")
                                    .font(.system(size: 32))
                                    .foregroundColor(.green)
                                Text("Nhấn để chọn tệp .fcq từ ứng dụng Tệp")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text("Khôi phục tên gốc, loại MIME và dữ liệu sau khi giải mã")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                            )
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)

                // 2. Password & Action Configuration
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Mật khẩu giải mã:")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        HStack {
                            if vm.isPasswordVisible {
                                TextField("Nhập mật khẩu đã dùng khi mã hóa...", text: $vm.password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Nhập mật khẩu đã dùng khi mã hóa...", text: $vm.password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }

                            Button {
                                vm.isPasswordVisible.toggle()
                            } label: {
                                Image(systemName: vm.isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(12)
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(10)
                    }

                    // Decrypt Action Button
                    Button {
                        vm.runDecrypt()
                    } label: {
                        HStack {
                            if vm.isProcessing {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "lock.open.fill")
                            }
                            Text(vm.isProcessing ? "Đang giải mã..." : "Bắt đầu giải mã tệp")
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(14)
                        .background(
                            LinearGradient(colors: [.green, .teal], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .shadow(color: .green.opacity(0.4), radius: 6, y: 3)
                    }
                    .disabled(vm.isProcessing || vm.selectedFileData == nil)
                    .opacity(vm.selectedFileData == nil ? 0.6 : 1.0)
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)

                // 3. Progress Box
                if vm.isProcessing {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(vm.progressMessage)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(Int(vm.progressValue * 100))%")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                        ProgressView(value: vm.progressValue, total: 1.0)
                            .accentColor(.green)
                    }
                    .padding()
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(12)
                }

                // 4. Result Card
                if vm.isCompleted, let outURL = vm.outputURL {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title)
                                .foregroundColor(.green)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Giải mã thành công!")
                                    .font(.headline)
                                Text(vm.completionMessage)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        ShareLink(item: outURL) {
                            HStack {
                                Image(systemName: "square.and.arrow.up.fill")
                                Text("Lưu / Chia sẻ tệp đã khôi phục: \(vm.outputFileName)")
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(12)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                    )
                }

                // 5. File Preview View
                FilePreviewView(
                    data: vm.outputData ?? vm.selectedFileData,
                    filename: vm.outputFileName.isEmpty ? vm.selectedFileName : vm.outputFileName,
                    mimeType: vm.selectedFileMime
                )
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)

                // 6. Transmission Simulator
                TransmissionView(
                    isProcessing: vm.isProcessing,
                    progress: vm.progressValue,
                    algorithmName: vm.selectedAlgorithm.name,
                    isCompleted: vm.isCompleted
                )
                .padding()
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
            }
            .padding()
        }
        .fileImporter(
            isPresented: $isShowingFilePicker,
            allowedContentTypes: [.item],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                if let url = urls.first {
                    vm.selectFile(url: url)
                }
            case .failure(let err):
                print("Lỗi chọn tệp: \(err)")
            }
        }
    }

    private func formatBytes(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useAll]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }
}
