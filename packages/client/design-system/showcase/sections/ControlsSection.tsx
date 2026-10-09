import { useState } from 'react';
import { Button, Checkbox, Field, IconButton, Pill, SearchField, Segmented, Stepper, Switch, TextArea } from '@/index';
import { Demo, Row, Section } from '../Section';

const KIND_OPTIONS = [
  { value: 'out', label: 'Chi tiêu' },
  { value: 'in', label: 'Thu nhập' },
];
const RANGE_OPTIONS = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];
const PILLS = ['Tất cả', 'Chi', 'Thu', 'Định kỳ', 'Ví MoMo'];
const SHOP_ITEMS = [
  { id: 'ca', label: 'Cà chua · 500 g', done: true },
  { id: 'ga', label: 'Gà ta · 1 con', done: false },
  { id: 'gung', label: 'Gừng · 1 củ', done: false },
];

function ButtonsDemo() {
  return (
    <Demo title="Button · variant × size" wide>
      <Row label="primary">
        <Button size="sm">Nhỏ</Button>
        <Button leadingIcon="plus">Thêm giao dịch</Button>
        <Button size="lg">Lưu giao dịch</Button>
        <Button disabled>Đã tắt</Button>
      </Row>
      <Row label="outline · ghost · affirm">
        <Button variant="outline">Huỷ</Button>
        <Button variant="outline" leadingIcon="book-open">Tự nhập công thức</Button>
        <Button variant="ghost" trailingIcon="caret-down">Tháng 10</Button>
        <Button variant="affirm">Tăng thêm 500.000 ₫</Button>
      </Row>
      <Row label="destructive">
        <Button variant="destructive">Ngắt kết nối</Button>
        <Button variant="destructive-outline" leadingIcon="trash">Xoá</Button>
      </Row>
      <Row label="icon button (surface · ghost · outline · badge)">
        <IconButton icon="bell" label="Thông báo" variant="surface" size="lg" badge />
        <IconButton icon="list" label="Bật/tắt bảng bên phải" />
        <IconButton icon="x" label="Đóng" variant="outline" />
        <IconButton icon="moon" label="Đổi giao diện" variant="ghost" size="sm" />
        <Button variant="ghost" size="icon" aria-label="Thêm">
          <span className="text-lg">+</span>
        </Button>
      </Row>
    </Demo>
  );
}

function FieldsDemo() {
  const [query, setQuery] = useState('Cà phê');
  return (
    <Demo title="Field · TextArea · SearchField">
      <Field placeholder="Ghi chú (ví dụ: Highlands Coffee)" leadingIcon="receipt" aria-label="Ghi chú" />
      <Field leadingIcon="chart-pie-slice" placeholder="Ví dụ: 500.000" trailing="₫" aria-label="Ngân sách tháng" defaultValue="2.600.000" />
      <Field placeholder="Tên hạng mục" leadingIcon="tag" invalid defaultValue="" aria-label="Tên hạng mục" />
      <Field placeholder="Đã tắt" disabled aria-label="Đã tắt" />
      <SearchField value={query} onValueChange={setQuery} placeholder="Tìm theo tên hoặc danh mục" />
      <TextArea placeholder="Ghi chú thêm cho giao dịch" aria-label="Ghi chú thêm" />
    </Demo>
  );
}

function TogglesDemo() {
  const [servings, setServings] = useState(4);
  const [kind, setKind] = useState('out');
  const [range, setRange] = useState('month');
  const [pill, setPill] = useState('Tất cả');
  const [notify, setNotify] = useState(true);
  return (
    <Demo title="Stepper · Switch · Segmented · Pill">
      <Row label="Stepper (1–8)">
        <Stepper label="Khẩu phần" value={servings} onChange={setServings} min={1} max={8} />
        <Stepper label="Tối thiểu" value={1} onChange={() => undefined} min={1} max={8} />
      </Row>
      <Row label="Switch">
        <Switch label="Nhắc nấu ăn" checked={notify} onCheckedChange={setNotify} />
        <Switch label="Đã tắt" defaultChecked={false} />
        <Switch label="Bật, bị khoá" defaultChecked disabled />
      </Row>
      <Row label="Segmented (2 và 3 lựa chọn)">
        <Segmented label="Loại giao dịch" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        <Segmented label="Khoảng thời gian" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </Row>
      <Row label="Pill (bộ lọc)">
        {PILLS.map((label) => (
          <Pill key={label} selected={pill === label} onClick={() => setPill(label)}>
            {label}
          </Pill>
        ))}
      </Row>
    </Demo>
  );
}

function ChecklistDemo() {
  return (
    <Demo title="Checkbox (hàng đi chợ)">
      <div className="divide-y divide-line-hairline">
        {SHOP_ITEMS.map((item) => (
          <Checkbox key={item.id} defaultChecked={item.done}>
            {item.label}
          </Checkbox>
        ))}
      </div>
      <Checkbox label="Đã tắt" disabled />
    </Demo>
  );
}

export function ControlsSection() {
  return (
    <Section id="controls" title="Điều khiển">
      <ButtonsDemo />
      <FieldsDemo />
      <TogglesDemo />
      <ChecklistDemo />
    </Section>
  );
}
