using Microsoft.AspNetCore.SignalR;

namespace ModernIssues.Hubs
{
    /// <summary>
    /// SignalR Hub để gửi thông báo thanh toán real-time
    /// Client sẽ subscribe vào group theo gencode để nhận notification
    /// </summary>
    public class PaymentHub : Hub
    {
        /// <summary>
        /// Client join vào group theo gencode để nhận notification
        /// </summary>
        public async Task JoinPaymentGroup(string gencode)
        {
            if (!string.IsNullOrWhiteSpace(gencode))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"payment_{gencode}");
                await Clients.Caller.SendAsync("JoinedGroup", gencode);
            }
        }

        /// <summary>
        /// Client leave khỏi group
        /// </summary>
        public async Task LeavePaymentGroup(string gencode)
        {
            if (!string.IsNullOrWhiteSpace(gencode))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"payment_{gencode}");
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}

