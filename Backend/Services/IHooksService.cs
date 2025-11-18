using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.Entities;

namespace ModernIssues.Services
{
    public interface IHooksService
    {
        Task AddTransactionAsync(BankTransaction transaction);
    }
}
