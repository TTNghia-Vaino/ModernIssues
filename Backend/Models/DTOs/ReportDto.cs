using System;
using System.Collections.Generic;

namespace ModernIssues.Models.DTOs
{
    /// <summary>
    /// DTO cho báo cáo thống kê theo từng kỳ (dùng chung cho sản phẩm, đơn hàng, người dùng)
    /// </summary>
    public class ReportDto
    {
        /// <summary>
        /// Nhãn thời gian (ví dụ: "2024-01-01", "2024-01", "Q1 2024", "2024")
        /// </summary>
        public string Period { get; set; } = string.Empty;

        /// <summary>
        /// Số lượng trong kỳ
        /// </summary>
        public int Count { get; set; }

        /// <summary>
        /// Ngày bắt đầu của kỳ (để sắp xếp)
        /// </summary>
        public DateTime PeriodStart { get; set; }
    }

    /// <summary>
    /// Response cho báo cáo thống kê
    /// </summary>
    public class ReportResponse
    {
        /// <summary>
        /// Loại báo cáo: day, month, quarter, year
        /// </summary>
        public string PeriodType { get; set; } = string.Empty;

        /// <summary>
        /// Tổng số lượng của tất cả các kỳ
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Danh sách thống kê theo từng kỳ
        /// </summary>
        public List<ReportDto> Data { get; set; } = new List<ReportDto>();
    }
}

