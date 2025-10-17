using System;
using System.Collections.Generic;

namespace ModernIssues.Models.Entities;

/// <summary>
/// Bảng lưu thông tin tài khoản người dùng (admin và customer)
/// </summary>
public partial class user
{
    public int user_id { get; set; }

    public string username { get; set; } = null!;

    public string password { get; set; } = null!;

    public string email { get; set; } = null!;

    public string? phone { get; set; }

    public string? address { get; set; }

    /// <summary>
    /// Phân quyền người dùng: customer hoặc admin
    /// </summary>
    public string? role { get; set; }

    public bool? is_disabled { get; set; }

    public bool? email_confirmed { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }

    public virtual ICollection<user> Inversecreated_byNavigation { get; set; } = new List<user>();

    public virtual ICollection<user> Inverseupdated_byNavigation { get; set; } = new List<user>();

    public virtual ICollection<category> categorycreated_byNavigations { get; set; } = new List<category>();

    public virtual ICollection<category> categoryupdated_byNavigations { get; set; } = new List<category>();

    public virtual user? created_byNavigation { get; set; }

    public virtual ICollection<faq> faqcreated_byNavigations { get; set; } = new List<faq>();

    public virtual ICollection<faq> faqupdated_byNavigations { get; set; } = new List<faq>();

    public virtual ICollection<log> logs { get; set; } = new List<log>();

    public virtual ICollection<order_detail> order_detailcreated_byNavigations { get; set; } = new List<order_detail>();

    public virtual ICollection<order_detail> order_detailupdated_byNavigations { get; set; } = new List<order_detail>();

    public virtual ICollection<order> ordercreated_byNavigations { get; set; } = new List<order>();

    public virtual ICollection<order> orderupdated_byNavigations { get; set; } = new List<order>();

    public virtual ICollection<order> orderusers { get; set; } = new List<order>();

    public virtual ICollection<product> productcreated_byNavigations { get; set; } = new List<product>();

    public virtual ICollection<product> productupdated_byNavigations { get; set; } = new List<product>();

    public virtual ICollection<promotion> promotioncreated_byNavigations { get; set; } = new List<promotion>();

    public virtual ICollection<promotion> promotionupdated_byNavigations { get; set; } = new List<promotion>();

    public virtual user? updated_byNavigation { get; set; }

    public virtual ICollection<warranty> warrantycreated_byNavigations { get; set; } = new List<warranty>();

    public virtual ICollection<warranty> warrantyupdated_byNavigations { get; set; } = new List<warranty>();

    public virtual ICollection<warranty> warrantyusers { get; set; } = new List<warranty>();
}
