import {
  ArrowRight,
  Armchair,
  Crosshair,
  Hand,
  Keyboard,
  ShieldCheck,
  Timer,
} from "lucide-react";

const tips = [
  {
    icon: Hand,
    title: "Tìm hàng phím cơ sở",
    text: "Tay trái đặt trên A S D F, tay phải trên J K L ;. Hai gờ nhỏ ở F và J giúp ngón trỏ tìm lại vị trí mà không cần nhìn bàn phím.",
  },
  {
    icon: Crosshair,
    title: "Đúng trước, nhanh sau",
    text: "Dùng đúng ngón được chỉ dẫn và giữ nhịp đều. Bài tập chỉ đi tiếp khi bạn gõ đúng ký tự hiện tại. Lỗi vẫn được ghi lại sau khi sửa.",
  },
  {
    icon: Armchair,
    title: "Để đôi tay thoải mái",
    text: "Ngồi thẳng thoải mái, thả lỏng vai, đặt chân vững trên sàn. Giữ cổ tay tự nhiên, không tì mạnh lên mép bàn. Nghỉ khi thấy mỏi.",
  },
  {
    icon: Timer,
    title: "Luyện ít, nhưng đều",
    text: "Bắt đầu với 5–10 phút mỗi ngày. Luyện lại bài chưa đạt mục tiêu và dành thêm thời gian cho những phím thường gõ nhầm.",
  },
  {
    icon: Keyboard,
    title: "Chuẩn bị bộ gõ",
    text: "Chọn Tự động, Mac, Windows hoặc Linux ở thanh trên cùng để hiện đúng các phím modifier. Chuyển bộ gõ sang English / ABC, tắt Caps Lock.",
  },
  {
    icon: ShieldCheck,
    title: "Tiến độ nằm trên máy bạn",
    text: "Mỗi profile có tiến độ riêng, được lưu khi hoàn thành bài và chỉ có trên trình duyệt này. Xóa dữ liệu trang hoặc dùng chế độ riêng tư có thể làm mất tiến độ. Bài đang gõ dở chưa được lưu.",
  },
];

export function Guide({
  onPractice,
  onOpenIntro,
}: {
  onPractice: () => void;
  onOpenIntro: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BẮT ĐẦU BẰNG THÓI QUEN TỐT</div>
          <h1>
            Để mười ngón tự tìm đường<span className="purple-text">.</span>
          </h1>
          <p>
            Một vài nguyên tắc nhỏ giúp mỗi buổi luyện tập hiệu quả và thoải mái
            hơn.
          </p>
        </div>
      </div>
      <section className="panel guide-intro-card">
        <span className="guide-intro-icon"><Hand size={30} /></span>
        <div>
          <span className="eyebrow">HƯỚNG DẪN TƯƠNG TÁC</span>
          <h2>Xem bàn tay, ngón tay và vùng phím</h2>
          <p>Chọn đúng kiểu bàn phím Mac, Windows hoặc Linux rồi xem ba bước đặt tay với màu hiển thị trực tiếp trên từng tay và từng ngón.</p>
        </div>
        <button className="button button-secondary" onClick={onOpenIntro}>
          Mở hướng dẫn <ArrowRight size={16} />
        </button>
      </section>
      <div className="guide-grid">
        {tips.map(({ icon: Icon, title, text }, index) => (
          <section className="panel guide-card" key={title}>
            <div className="section-line">
              <span className="guide-icon">
                <Icon size={23} />
              </span>
              <span className="eyebrow">0{index + 1}</span>
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <section className="panel metric-explanation">
        <h2>Hiểu các chỉ số của bạn</h2>
        <p>
          <strong>WPM (từ/phút):</strong> một từ tiêu chuẩn bằng 5 ký tự, tính
          cả khoảng trắng. Tốc độ = số ký tự đã hoàn thành ÷ 5 ÷ số phút đang
          luyện.
        </p>
        <p>
          <strong>CPM (ký tự/phút):</strong> tổng số ký tự hoàn thành trong một
          phút, bao gồm cả khoảng trắng. Theo chuẩn trên, CPM bằng WPM × 5.
        </p>
        <p>
          <strong>Độ chính xác:</strong> số lần gõ đúng ÷ tổng số lần gõ.
          Backspace không xóa lịch sử lỗi; gõ sai phải gõ lại đúng để đi tiếp.
        </p>
        <p>
          <strong>Hoàn thành và đạt mục tiêu:</strong> gõ hết nội dung để hoàn
          thành bài. Đạt cả ngưỡng WPM và độ chính xác của bài để được đánh dấu
          “Đã đạt”. Các ngưỡng này là mục tiêu luyện tập của Keylane.
        </p>
        <p>
          <strong>Xe đua:</strong> vị trí bằng tỷ lệ ký tự đã hoàn thành. Gõ
          đúng càng nhanh, xe tiến càng nhanh; khi sửa bằng Backspace, xe lùi
          theo tiến độ.
        </p>
        <p>
          <strong>Tạm dừng:</strong> nhấn Esc hoặc nút tạm dừng. Đổi tab hoặc
          rời vùng gõ cũng tự tạm dừng. Thời gian nghỉ không tính vào kết quả.
        </p>
      </section>
      <div className="guide-footer">
        <p>
          Tham khảo:{" "}
          <a
            href="https://www.typing.com/blog/5-tips-type-faster/"
            target="_blank"
            rel="noreferrer"
          >
            Phương pháp luyện gõ
          </a>{" "}
          và{" "}
          <a
            href="https://www.typing.com/blog/typing-posture/"
            target="_blank"
            rel="noreferrer"
          >
            tư thế gõ từ Typing.com
          </a>
          .
        </p>
        <button className="button button-primary" onClick={onPractice}>
          Bắt đầu luyện tập <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
