using System;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho báo cáo doanh thu theo từng kỳ
    /// </summary>
    public class RevenueReportDto
    {
        /// <summary>
        /// Nhãn thời gian (ví dụ: "2024-01-01", "2024-01", "Q1 2024", "2024")
        /// </summary>
        public string Period { get; set; } = string.Empty;

        /// <summary>
        /// Tổng doanh thu trong kỳ
        /// </summary>
        public decimal Revenue { get; set; }

        /// <summary>
        /// Số lượng đơn hàng trong kỳ
        /// </summary>
        public int OrderCount { get; set; }

        /// <summary>
        /// Ngày bắt đầu của kỳ (để sắp xếp)
        /// </summary>
        public DateTime PeriodStart { get; set; }
    }

    /// <summary>
    /// Response cho báo cáo doanh thu
    /// </summary>
    public class RevenueReportResponse
    {
        /// <summary>
        /// Loại báo cáo: day, month, quarter, year
        /// </summary>
        public string PeriodType { get; set; } = string.Empty;

        /// <summary>
        /// Tổng doanh thu của tất cả các kỳ
        /// </summary>
        public decimal TotalRevenue { get; set; }

        /// <summary>
        /// Tổng số đơn hàng
        /// </summary>
        public int TotalOrders { get; set; }

        /// <summary>
        /// Danh sách doanh thu theo từng kỳ
        /// </summary>
        public List<RevenueReportDto> Data { get; set; } = new List<RevenueReportDto>();
    }
}

