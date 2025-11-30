namespace ModernIssues.Models.DTOs
{
    public class BankTransactionDto
    {
        public string Gateway { get; set; }
        public string Transactiondate { get; set; } 
        public string Accountnumber { get; set; }
        public string? Subaccount { get; set; }
        public string? Code { get; set; }
        public string Content { get; set; }
        public string Transfertype { get; set; }
        public string Description { get; set; }
        public decimal Transferamount { get; set; }
        public string Referencecode { get; set; }
        public decimal Accumulated { get; set; }
    }
}
