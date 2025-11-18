using Microsoft.AspNetCore.Mvc;
using ModernIssues.Services;
using ModernIssues.Models.DTOs;
using ModernIssues.Models.Entities;

namespace ModernIssues.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HooksController : Controller
    {
        private readonly IHooksService _hooksService;

        public HooksController(IHooksService hooksService)
        {
            _hooksService = hooksService;
        }

        [HttpPost("transaction")]
        public async Task<IActionResult> ReceiveTransaction(BankTransaction dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var entity = new BankTransaction
            {
                Id = dto.Id,
                Gateway = dto.Gateway,
                Transactiondate = dto.Transactiondate,
                Accountnumber = dto.Accountnumber,
                Code = dto.Code,
                Content = dto.Content,
                Transfertype = dto.Transfertype,
                Transferamount = dto.Transferamount,
                Accumulated = dto.Accumulated,
                Subaccount = dto.Subaccount,
                Referencecode = dto.Referencecode,
                Description = dto.Description
            };

            await _hooksService.AddTransactionAsync(entity);

            return Ok(new { message = "Transaction" + dto.Id + dto.Transferamount + dto.Content + "saved" });
        }
    }
}
