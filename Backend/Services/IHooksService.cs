using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.Entities;

namespace ModernIssues.Services
{
    public interface IHooksService
    {
        Task AddTransactionAsync(BankTransaction transaction);
        Task<TransactionProcessResult> ProcessTransactionAsync(BankTransaction transaction);
    }

    public class TransactionProcessResult
    {
        public string Message { get; set; } = string.Empty;
        public bool OrderUpdated { get; set; }
        public int? OrderId { get; set; }
    }
}
