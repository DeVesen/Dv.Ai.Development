using IndexSolution.Domain;
using Microsoft.AspNetCore.Mvc;

namespace IndexSolution.Api;

[ApiController]
[Route("api/[controller]")]
public class CalcController : ControllerBase
{
    private readonly ICalcService _calc;

    public CalcController(ICalcService calc) => _calc = calc;

    [HttpGet]
    public int Get(int a, int b) => _calc.Add(a, b);
}
