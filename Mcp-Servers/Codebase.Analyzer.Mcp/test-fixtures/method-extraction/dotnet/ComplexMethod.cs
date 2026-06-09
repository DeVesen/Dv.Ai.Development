namespace MethodExtraction.Fixtures;

public class OrderProcessor
{
    // Short method — below thresholds.
    public int ShortMethod(int x) => x + 1;

    public decimal ProcessOrder(Order order, List<OrderItem> items, DiscountConfig discountConfig)
    {
        decimal total = 0;
        var valid = true;

        // validate order items
        foreach (var item in items)
        {
            if (string.IsNullOrEmpty(item.Sku) || item.Qty <= 0)
            {
                valid = false;
                break;
            }
            if (item.Qty > 100)
            {
                valid = false;
            }
        }
        if (!valid)
            throw new InvalidOperationException("invalid items");

        // apply discount rules
        foreach (var item in items)
        {
            decimal price = item.Qty * 10m;
            if (discountConfig.Pct > 0)
                price = price * (1 - discountConfig.Pct / 100m);
            if (order.Id.StartsWith("VIP"))
                price = price * 0.9m;
            total += price;
        }

        if (total > 1000m)
            total = total * 0.95m;
        else if (total > 500m)
            total = total * 0.98m;

        return total;
    }
}

public record Order(string Id);
public record OrderItem(string Sku, int Qty);
public record DiscountConfig(decimal Pct);
