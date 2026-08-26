import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatQuantity } from '../../utils/formatters';
import {
  BarChart3,
  Download,
  Calendar,
  Package,
  TrendingUp,
  Award,
  DollarSign,
  FileSpreadsheet
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { batches, orders, products, customers, addToast } = useApp();

  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');

  // Filter orders by batch if selected
  const activeOrders = orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    if (selectedBatchId !== 'ALL' && o.batch_id !== selectedBatchId) return false;
    return true;
  });

  // Calculate product sales breakdown
  const productStatsMap: Record<
    string,
    {
      product_name: string;
      unit: string;
      size?: string;
      total_quantity: number;
      total_revenue: number;
      order_count: number;
    }
  > = {};

  activeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.product_id;
      if (!productStatsMap[key]) {
        productStatsMap[key] = {
          product_name: item.product_name,
          unit: item.unit,
          size: item.size,
          total_quantity: 0,
          total_revenue: 0,
          order_count: 0,
        };
      }
      const qty = item.quantity_actual !== undefined ? item.quantity_actual : item.quantity_ordered;
      productStatsMap[key].total_quantity += qty;
      productStatsMap[key].total_revenue += item.subtotal || 0;
      productStatsMap[key].order_count += 1;
    });
  });

  const productStatsList = Object.values(productStatsMap).sort(
    (a, b) => b.total_revenue - a.total_revenue
  );

  // Top condo customers
  const customerStatsMap: Record<
    string,
    { name: string; building: string; room: string; phone: string; total_spent: number; order_count: number }
  > = {};

  activeOrders.forEach((order) => {
    const key = order.customer_id;
    if (!customerStatsMap[key]) {
      customerStatsMap[key] = {
        name: order.customer_name,
        building: order.customer_building,
        room: order.customer_room,
        phone: order.customer_phone,
        total_spent: 0,
        order_count: 0,
      };
    }
    customerStatsMap[key].total_spent += order.total;
    customerStatsMap[key].order_count += 1;
  });

  const topCustomers = Object.values(customerStatsMap).sort((a, b) => b.total_spent - a.total_spent);

  // Batch breakdown stats
  const batchStats = batches.map((batch) => {
    const bOrders = orders.filter((o) => o.batch_id === batch.batch_id && o.status !== 'CANCELLED');
    const revenue = bOrders.reduce((sum, o) => sum + o.total, 0);
    const debt = bOrders.reduce((sum, o) => sum + o.debt_amount, 0);
    const paid = bOrders.reduce((sum, o) => sum + o.paid_amount, 0);

    return {
      batch,
      orderCount: bOrders.length,
      revenue,
      paid,
      debt,
    };
  });

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese
    csv += 'Mã đơn,Tòa,Phòng,Khách hàng,Số điện thoại,Đợt hàng,Ngày giao,Mặt hàng,Tổng tiền,Đã trả,Còn nợ,Trạng thái đơn,Trạng thái giao\n';

    activeOrders.forEach((o) => {
      const itemsStr = o.items
        .map((i) => `${i.product_name} (${i.quantity_actual ?? i.quantity_ordered}${i.unit})`)
        .join('; ');

      csv += `"${o.order_code}","${o.customer_building}","${o.customer_room}","${o.customer_name}","${o.customer_phone}","${o.batch_name}","${o.delivery_date}","${itemsStr}",${o.total},${o.paid_amount},${o.debt_amount},"${o.status}","${o.delivery_status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_don_hai_san_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('success', 'Xuất báo cáo thành công', 'File CSV đã được tải về máy của bạn!');
  };

  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalPaid = activeOrders.reduce((sum, o) => sum + o.paid_amount, 0);
  const totalDebt = activeOrders.reduce((sum, o) => sum + o.debt_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-teal-800" /> Báo Cáo Doanh Thu & Sản Lượng
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tổng hợp số lượng hải sản bán ra theo từng đợt, xếp hạng khách ruột và xuất file Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md text-xs sm:text-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-teal-400" /> Xuất File CSV / Excel
          </button>
        </div>
      </div>

      {/* Batch Selector Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
          <Calendar className="w-4 h-4 text-teal-800" /> Lọc theo đợt gom hàng:
        </div>
        <select
          id="report-batch-filter"
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700 font-bold text-teal-950"
        >
          <option value="ALL">Tất cả các đợt gom</option>
          {batches.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>
              {b.batch_name} ({formatDate(b.batch_date)})
            </option>
          ))}
        </select>
      </div>

      {/* Overall Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Tổng Doanh Thu</div>
          <div className="text-2xl font-black text-teal-950 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-slate-500 mt-1">{activeOrders.length} đơn hàng thực hiện</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Thực Thu Về</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{formatCurrency(totalPaid)}</div>
          <div className="text-xs text-emerald-700 mt-1">Đã nhận đủ qua CK / Tiền mặt</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Công nợ / COD chưa thu</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(totalDebt)}</div>
          <div className="text-xs text-rose-600 mt-1">Chờ thu khi giao hoặc cư dân CK sau</div>
        </div>
      </div>

      {/* TWO SECTIONS: PRODUCT QUANTITIES & TOP CUSTOMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Seafood sold quantities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-800" /> Sản Lượng Hải Sản Bán Ra
            </h3>
            <span className="text-xs text-slate-500 font-medium">{productStatsList.length} mặt hàng</span>
          </div>

          <div className="space-y-2.5">
            {productStatsList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{item.product_name}</div>
                  <div className="text-slate-500 text-[11px]">
                    {item.size || ''} • {item.order_count} phòng đặt
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-teal-950 text-sm">
                    {formatQuantity(item.total_quantity, item.unit)}
                  </div>
                  <div className="text-slate-600 font-medium">{formatCurrency(item.total_revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Top Condo Residents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" /> Top Cư Dân Đặt Hàng Nhiều Nhất
            </h3>
            <span className="text-xs text-slate-500 font-medium">{topCustomers.length} hộ</span>
          </div>

          <div className="space-y-2.5">
            {topCustomers.slice(0, 7).map((cust, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-900'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-black text-slate-900 text-sm">
                      {cust.building} - P.{cust.room} ({cust.name})
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">{cust.phone}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-teal-950 text-sm">{formatCurrency(cust.total_spent)}</div>
                  <div className="text-slate-500 text-[11px]">{cust.order_count} lần gom</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
