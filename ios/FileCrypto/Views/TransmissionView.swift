//
//  TransmissionView.swift
//  FileCrypto iOS
//

import SwiftUI

public struct TransmissionView: View {
    public let isProcessing: Bool
    public let progress: Double
    public let algorithmName: String
    public let isCompleted: Bool

    @State private var phase: Double = 0.0

    public init(isProcessing: Bool, progress: Double, algorithmName: String, isCompleted: Bool) {
        self.isProcessing = isProcessing
        self.progress = progress
        self.algorithmName = algorithmName
        self.isCompleted = isCompleted
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Mô phỏng đường truyền (Transmission)", systemImage: "waveform.path")
                .font(.headline)
                .foregroundColor(.primary)

            ZStack {
                // Background Box
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color(UIColor.secondarySystemBackground))
                    .frame(height: 110)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )

                // Pipe Line
                GeometryReader { geo in
                    let leftX = 60.0
                    let midX = geo.size.width / 2
                    let rightX = geo.size.width - 60.0
                    let centerY = geo.size.height / 2

                    // Base pipe
                    Path { path in
                        path.move(to: CGPoint(x: leftX, y: centerY))
                        path.addLine(to: CGPoint(x: rightX, y: centerY))
                    }
                    .stroke(Color.white.opacity(0.15), lineWidth: 4)

                    // Active progress pipe
                    if isProcessing || isCompleted {
                        let currentX = leftX + (rightX - leftX) * (isCompleted ? 1.0 : progress)
                        Path { path in
                            path.move(to: CGPoint(x: leftX, y: centerY))
                            path.addLine(to: CGPoint(x: currentX, y: centerY))
                        }
                        .stroke(
                            LinearGradient(
                                colors: [.cyan, .purple, .green],
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            lineWidth: 4
                        )
                        .shadow(color: .cyan.opacity(0.6), radius: 6)
                    }

                    // Nodes
                    nodeView(title: "Nguồn", icon: "doc.fill", color: .blue)
                        .position(x: leftX, y: centerY)

                    nodeView(title: algorithmName, icon: "bolt.shield.fill", color: .purple, isCenter: true)
                        .position(x: midX, y: centerY)

                    nodeView(title: "Bản mã .fcq", icon: "lock.shield.fill", color: .green)
                        .position(x: rightX, y: centerY)
                }
            }
            .frame(height: 110)
        }
    }

    @ViewBuilder
    private func nodeView(title: String, icon: String, color: Color, isCenter: Bool = false) -> some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(Color(UIColor.systemBackground))
                    .frame(width: isCenter ? 44 : 38, height: isCenter ? 44 : 38)
                    .overlay(
                        Circle()
                            .stroke(color, lineWidth: isCenter ? 2.5 : 1.5)
                            .shadow(color: color.opacity(isProcessing ? 0.8 : 0.3), radius: isProcessing ? 8 : 3)
                    )

                Image(systemName: icon)
                    .font(.system(size: isCenter ? 18 : 15, weight: .bold))
                    .foregroundColor(color)
            }

            Text(title)
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
    }
}
