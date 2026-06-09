namespace BoyscoutActionsFixture;

public class BoyscoutSample
{
    private void UnusedHelper() => Console.WriteLine("never called");

    public string ReadFirst(List<string?> items)
    {
        return items.FirstOrDefault()!.Length.ToString();
    }

    public int PublishOrder(string orderId, List<(int Qty, decimal Price)> items)
    {
        var total = 0m;
        var valid = true;

        foreach (var item in items)
        {
            if (item.Qty <= 0)
            {
                valid = false;
                break;
            }
            if (item.Price < 0)
            {
                valid = false;
            }
        }
        if (!valid)
        {
            throw new InvalidOperationException("invalid");
        }

        foreach (var item in items)
        {
            var line = item.Qty * item.Price;
            if (orderId.StartsWith("VIP"))
            {
                line *= 0.9m;
            }
            else if (orderId.StartsWith("BULK"))
            {
                line *= 0.85m;
            }
            if (line > 500)
            {
                line *= 0.95m;
            }
            else if (line > 100)
            {
                line *= 0.98m;
            }
            total += line;
        }

        return (int)total;
    }
}
