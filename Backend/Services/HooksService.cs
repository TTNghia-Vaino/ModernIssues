using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.Entities;

namespace ModernIssues.Services
{
    public class HooksService : IHooksService
    {
        private readonly WebDbContext _context;

        public HooksService(WebDbContext context)
        {
            _context = context;
        }
        public async Task AddTransactionAsync(BankTransaction transaction)
        {
            if (transaction == null)
                throw new ArgumentNullException(nameof(transaction));

            await _context.BankTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }
    }
}
