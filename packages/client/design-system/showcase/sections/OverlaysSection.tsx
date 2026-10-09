import { useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Dialog,
  Field,
  IconButton,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  OptionPicker,
  Popover,
  ResponsiveDialog,
  Segmented,
  Sheet,
  useToast,
  type PickerOption,
} from '@/index';
import { Demo, Row, Section } from '../Section';

const WALLETS: PickerOption[] = [
  { value: 'tcb', label: 'Techcombank', hint: '38.420.000 ₫', icon: 'wallet' },
  { value: 'momo', label: 'Ví MoMo', hint: '1.250.000 ₫', icon: 'device-mobile' },
  { value: 'cash', label: 'Tiền mặt', hint: '820.000 ₫', icon: 'wallet' },
];
const KINDS = [
  { value: 'out', label: 'Chi tiêu' },
  { value: 'in', label: 'Thu nhập' },
];

function AddTransactionForm() {
  const [kind, setKind] = useState('out');
  const [wallet, setWallet] = useState<string | null>('momo');
  return (
    <div className="grid gap-3">
      <Segmented label="Loại giao dịch" options={KINDS} value={kind} onChange={setKind} className="w-full" />
      <Field placeholder="Ghi chú (ví dụ: Highlands Coffee)" leadingIcon="receipt" aria-label="Ghi chú" />
      <OptionPicker label="Ví" value={wallet} onChange={setWallet} options={WALLETS} placement="top" />
    </div>
  );
}

function MenusDemo() {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<string | null>('tcb');
  return (
    <Demo title="Popover · Menu · OptionPicker (thay cho select)">
      <Row label="Menu có icon, nhãn, ngăn cách, mục phá huỷ">
        <Menu trigger={<Button variant="outline" trailingIcon="caret-down">Tuỳ chọn</Button>}>
          <MenuLabel>Giao dịch</MenuLabel>
          <MenuItem icon="pencil-simple" onSelect={() => toast('Đã mở chỉnh sửa')}>Chỉnh sửa</MenuItem>
          <MenuItem icon="copy" hint="Ctrl+D">Nhân bản</MenuItem>
          <MenuSeparator />
          <MenuItem icon="trash" destructive>Xoá giao dịch</MenuItem>
        </Menu>
        <Menu placement="top" align="end" trigger={<IconButton icon="dots-three" label="Thêm tuỳ chọn" variant="outline" />}>
          <MenuItem>Mở lên trên</MenuItem>
          <MenuItem>Căn lề phải</MenuItem>
        </Menu>
      </Row>
      <Row label="Popover tự do">
        <Popover trigger={<Button variant="ghost" leadingIcon="info">Chi tiết ngân sách</Button>} label="Chi tiết ngân sách">
          <div className="grid max-w-72 gap-1 p-3 text-sm">
            <b>Ăn uống đã dùng 88%</b>
            <span className="text-text-secondary">Còn 310.000 ₫ cho 22 ngày.</span>
          </div>
        </Popover>
      </Row>
      <Row label="OptionPicker">
        <div className="w-full max-w-80">
          <OptionPicker label="Ví" value={wallet} onChange={setWallet} options={WALLETS} leadingIcon="wallet" />
        </div>
      </Row>
    </Demo>
  );
}

function DialogsDemo() {
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [responsive, setResponsive] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { toast } = useToast();
  const footer = (
    <>
      <Button variant="outline" onClick={() => { setDialog(false); setSheet(false); setResponsive(false); }}>Huỷ</Button>
      <Button onClick={() => { setDialog(false); setSheet(false); setResponsive(false); toast('Đã lưu giao dịch'); }}>Lưu giao dịch</Button>
    </>
  );
  return (
    <Demo title="Dialog · Sheet · ResponsiveDialog · ConfirmDialog" wide>
      <Row>
        <Button variant="outline" onClick={() => setDialog(true)}>Mở Dialog</Button>
        <Button variant="outline" onClick={() => setSheet(true)}>Mở Sheet</Button>
        <Button variant="outline" onClick={() => setResponsive(true)}>Mở ResponsiveDialog</Button>
        <Button variant="destructive-outline" onClick={() => setConfirm(true)}>Ngắt kết nối Google</Button>
      </Row>
      <Dialog open={dialog} onOpenChange={setDialog} title="Thêm giao dịch" footer={footer}>
        <AddTransactionForm />
      </Dialog>
      <Sheet open={sheet} onOpenChange={setSheet} title="Hạng mục mới" description="Chọn tên và biểu tượng cho hạng mục." footer={footer}>
        <AddTransactionForm />
      </Sheet>
      <ResponsiveDialog open={responsive} onOpenChange={setResponsive} title="Thêm công thức" description="Dán link công thức hoặc tự nhập." footer={footer}>
        <Field placeholder="Dán link công thức (blog, Cookpad, YouTube…)" leadingIcon="link" aria-label="Đường dẫn công thức" />
      </ResponsiveDialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        destructive
        title="Ngắt kết nối Google?"
        description="Dữ liệu trên máy này được giữ nguyên. Bản sao trên Google Drive của bạn cũng không bị xoá, nhưng thay đổi mới sẽ không được đồng bộ nữa."
        confirmLabel="Ngắt kết nối"
        cancelLabel="Giữ kết nối"
        onConfirm={() => toast('Đã ngắt kết nối Google')}
      />
    </Demo>
  );
}

export function OverlaysSection() {
  return (
    <Section id="overlays" title="Lớp phủ">
      <MenusDemo />
      <DialogsDemo />
    </Section>
  );
}
