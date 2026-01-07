import { ApiOrder, transformOrder, transformOrderToApi } from "../orders";

describe("transformOrder", () => {
  it("maps API fields to frontend Order correctly", () => {
    const api: ApiOrder = {
      id: "uuid-1",
      order_number: "ORD-001",
      customer_name: "John Doe",
      address: "123 Main St",
      phone: "555-0100",
      notes: "Leave at door",
      amount: 25.5,
      items: "Widget A",
      priority: "high",
      package_length: 10,
      package_width: 5,
      package_height: 2,
      package_weight: 1.5,
      package_volume: 100,
      latitude: 40.1,
      longitude: -74.2,
      driver_id: "backend-driver-uuid",
      route_rank: 3,
      raw_data: { any: "thing" },
    };

    const order = transformOrder(api);
    expect(order.id).toBe("ORD-001");
    expect(order.customerName).toBe("John Doe");
    expect(order.address).toBe("123 Main St");
    expect(order.phone).toBe("555-0100");
    expect(order.notes).toBe("Leave at door");
    expect(order.amount).toBe(25.5);
    expect(order.items).toBe("Widget A");
    expect(order.priority).toBe("high");
    expect(order.rank).toBe(3);
    expect(order.latitude).toBe(40.1);
    expect(order.longitude).toBe(-74.2);
    expect(order.packageLength).toBe(10);
    expect(order.packageWidth).toBe(5);
    expect(order.packageHeight).toBe(2);
    expect(order.packageWeight).toBe(1.5);
    expect(order.packageVolume).toBe(100);
    expect(order.serverId).toBe("uuid-1");
    expect(order.rawData).toEqual({ any: "thing" });
  });

  it("falls back to default/undefined values safely", () => {
    const api: ApiOrder = {
      id: "uuid-2",
      order_number: "",
      customer_name: "Jane",
      address: "456 Oak",
    } as any;
    const order = transformOrder(api);
    expect(order.id).toBe("uuid-2"); // fallback to id when order_number missing
    expect(order.priority).toBe("normal");
    expect(order.rank).toBeUndefined();
  });
});

describe("transformOrderToApi", () => {
  it("maps frontend Order to API fields correctly", () => {
    const order = {
      id: "ORD-123",
      customerName: "Sam",
      address: "789 Pine",
      phone: "555-0300",
      notes: "Call on arrival",
      amount: 10,
      items: "Item X",
      priority: "low" as const,
      packageLength: 1,
      packageWidth: 2,
      packageHeight: 3,
      packageWeight: 4,
      packageVolume: 24,
      latitude: 1.1,
      longitude: 2.2,
      driverId: undefined,
      rank: 5,
      rawData: { ok: true },
    };
    const api = transformOrderToApi(order as any);
    expect(api.order_number).toBe("ORD-123");
    expect(api.customer_name).toBe("Sam");
    expect(api.address).toBe("789 Pine");
    expect(api.phone).toBe("555-0300");
    expect(api.notes).toBe("Call on arrival");
    expect(api.amount).toBe(10);
    expect(api.items).toBe("Item X");
    expect(api.priority).toBe("low");
    expect(api.package_length).toBe(1);
    expect(api.package_width).toBe(2);
    expect(api.package_height).toBe(3);
    expect(api.package_weight).toBe(4);
    expect(api.package_volume).toBe(24);
    expect(api.latitude).toBe(1.1);
    expect(api.longitude).toBe(2.2);
    expect(api.driver_id).toBeUndefined();
    expect(api.route_rank).toBe(5);
    expect(api.rawData).toEqual({ ok: true });
  });
});
