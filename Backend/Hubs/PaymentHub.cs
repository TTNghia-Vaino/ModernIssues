using Microsoft.AspNetCore.SignalR;

namespace ModernIssues.Hubs
{
    public class PaymentHub : Hub
    {
        public async Task JoinPaymentGroup(string userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        public async Task LeavePaymentGroup(string userId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
    }
}

