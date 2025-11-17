using System;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho báo cáo tỷ lệ phương thức thanh toán theo kỳ
    /// </summary>
    public class PaymentMethodReportDto
    {
        /// <summary>
        /// Nhãn thời gian (ví dụ: "2024-01-01", "2024-01", "Q1 2024", "2024")
        /// </summary>
        public string Period { get; set; } = string.Empty;

        /// <summary>
        /// Phương thức thanh toán (COD, Transfer, ATM, VNPay, ...)
        /// </summary>
        public string PaymentMethod { get; set; } = string.Empty;

        /// <summary>
        /// Tên hiển thị của phương thức thanh toán
        /// </summary>
        public string PaymentMethodDisplay { get; set; } = string.Empty;

        /// <summary>
        /// Số lượng đơn hàng
        /// </summary>
        public int OrderCount { get; set; }

        /// <summary>
        /// Tỷ lệ phần trăm
        /// </summary>
        public decimal Percentage { get; set; }

        /// <summary>
        /// Ngày bắt đầu của kỳ (để sắp xếp)
        /// </summary>
        public DateTime PeriodStart { get; set; }
    }

    /// <summary>
    /// Response cho báo cáo tỷ lệ phương thức thanh toán
    /// </summary>
    public class PaymentMethodReportResponse
    {
        /// <summary>
        /// Loại báo cáo: day, month, quarter, year
        /// </summary>
        public string PeriodType { get; set; } = string.Empty;

        /// <summary>
        /// Tổng số đơn hàng
        /// </summary>
        public int TotalOrders { get; set; }

        /// <summary>
        /// Danh sách tỷ lệ theo phương thức thanh toán và kỳ
        /// </summary>
        public List<PaymentMethodReportDto> Data { get; set; } = new List<PaymentMethodReportDto>();
    }

    /// <summary>
    /// DTO cho báo cáo số lượng đơn theo trạng thái theo kỳ
    /// </summary>
    public class OrderStatusReportDto
    {
        /// <summary>
        /// Nhãn thời gian (ví dụ: "2024-01-01", "2024-01", "Q1 2024", "2024")
        /// </summary>
        public string Period { get; set; } = string.Empty;

        /// <summary>
        /// Trạng thái đơn hàng (pending, completed, delivered, cancelled, ...)
        /// </summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// Tên hiển thị của trạng thái
        /// </summary>
        public string StatusDisplay { get; set; } = string.Empty;

        /// <summary>
        /// Số lượng đơn hàng
        /// </summary>
        public int OrderCount { get; set; }

        /// <summary>
        /// Tỷ lệ phần trăm
        /// </summary>
        public decimal Percentage { get; set; }

        /// <summary>
        /// Ngày bắt đầu của kỳ (để sắp xếp)
        /// </summary>
        public DateTime PeriodStart { get; set; }
    }

    /// <summary>
    /// Response cho báo cáo số lượng đơn theo trạng thái
    /// </summary>
    public class OrderStatusReportResponse
    {
        /// <summary>
        /// Loại báo cáo: day, month, quarter, year
        /// </summary>
        public string PeriodType { get; set; } = string.Empty;

        /// <summary>
        /// Tổng số đơn hàng
        /// </summary>
        public int TotalOrders { get; set; }

        /// <summary>
        /// Danh sách số lượng theo trạng thái và kỳ
        /// </summary>
        public List<OrderStatusReportDto> Data { get; set; } = new List<OrderStatusReportDto>();
    }
}

