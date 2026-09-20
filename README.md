# Keylane

Ứng dụng học gõ 10 ngón bằng React 19, TypeScript và Vite. Toàn bộ lộ trình 250 bài được đọc từ `src/data/curriculum.json`; UI không khai báo riêng từng bài. Giao diện dùng tiếng Việt, nội dung luyện QWERTY dùng ký tự Latin và tiến độ được lưu cục bộ trên trình duyệt.

## Chạy dự án

Yêu cầu Node.js 20.18+ và npm.

```sh
npm install
npm run dev
```

Kiểm tra TypeScript tĩnh:

```sh
npm run typecheck
```

Theo `AGENTS.md`, không tự chạy build hoặc test nếu người dùng chưa yêu cầu rõ. Lần cập nhật curriculum này chỉ được kiểm tra tĩnh.

## Context cần biết khi sửa tiếp

Luồng dữ liệu chính:

```text
src/data/curriculum.json
        │
        ▼
src/data/curriculum.ts ── validate + chuyển RawLesson → Lesson
        │
        ├── src/domain/exercise.ts ── capability validator + sinh nội dung xác định
        ▼
src/services/local.ts ── LessonService
        ▼
src/App.tsx ── tải bài, route, chọn bài, khóa/mở bài
        ├── LessonLibrary.tsx ── 10 phase và 250 lesson
        ├── Practice.tsx + useTypingSession.ts ── phiên luyện
        └── Progress.tsx ── lịch sử và thống kê
```

Các file quan trọng:

- `src/data/curriculum.json`: nguồn sự thật duy nhất cho phase, thứ tự, phím và bài tập.
- `src/data/curriculum.ts`: schema đầu vào, adapter sang model ứng dụng và validator.
- `src/domain/types.ts`: model `Curriculum`, `CurriculumPhase`, `Lesson`, `LessonExercise`, tiến độ và phiên gõ.
- `src/domain/exercise.ts`: `generateExercise`, `generateLessonText`, word bank dùng chung và invariant phím đã mở khóa.
- `src/domain/progression.ts`: quy tắc mở khóa và chọn bài nên học tiếp.
- `src/domain/typing.ts`: nhận phím, WPM, accuracy và điều kiện đạt bài.
- `src/domain/keyboard.ts`: ánh xạ QWERTY, ngón/tay và Shift đối diện.
- `src/components/TypingIntro.tsx`: ba minh họa SVG/CSS động cho hàng cơ sở, vùng hai tay và vùng từng ngón; dùng layout đang chọn.
- `src/services/contracts.ts`, `src/services/local.ts`: abstraction dữ liệu và localStorage.

## Schema curriculum thực tế

Top-level:

```ts
interface RawCurriculum {
  name: string;
  version: number;
  lessonCount: number;
  designNotes: string[];
  phases: Array<{
    id: string;
    title: string;
    lessonRange: [number, number];
    lessonCount: number;
  }>;
  lessons: RawLesson[];
}
```

Mỗi bài:

```ts
interface RawLesson {
  id: number;
  phase: string;
  title: string;
  type: string;
  newKeys: string[];
  focusKeys: string[];
  availableKeys: string[];
  target: { accuracy: number; wpm: number | null };
  estimatedMinutes: number;
  exercises: Array<{
    type: ExerciseType;
    text: string;
    durationSeconds?: number;
  }>;
}
```

File hiện có 10 phase, ID bài liên tục 1–250 và 13 loại exercise:

`accuracy_test`, `alternating`, `focus_drill`, `mixed_drill`, `number_drill`, `pattern`, `pattern_drill`, `sentence`, `symbol_drill`, `timed_text`, `timed_words`, `warmup`, `word_drill`.

JSON hiện không có trường `prerequisites` hoặc `difficulty`. Runtime vì vậy suy ra prerequisite theo thứ tự: bài 1 luôn mở; bài N mở khi bài N−1 có ít nhất một attempt đạt mục tiêu. Cấp độ hiển thị được suy ra theo phase/order và không làm thay đổi nội dung JSON.

Ba trường về phím có ý nghĩa khác nhau:

- `newKeys`: phím hoặc khả năng gõ được giới thiệu trong bài hiện tại.
- `focusKeys`: phím/mẫu cần xuất hiện với tần suất cao hơn trong bài sinh tự động.
- `availableKeys`: toàn bộ ký tự mà người học được phép tạo ra tại bài hiện tại.

`difficulty` chưa cần lưu lặp lại trong 250 bài. Cấp độ hiển thị hiện được suy ra từ vị trí bài; nếu sau này cần difficulty chi tiết hơn, có thể suy ra thêm từ phase, loại exercise, accuracy/WPM mục tiêu và độ dài nội dung.

## Cách tạo nội dung luyện

`curriculum.ts` giữ metadata JSON và ghép năm exercise thành một phiên luyện. Mỗi exercise đi qua `generateExercise({ lesson, exercise, seed })`:

1. Chuẩn hóa khoảng trắng trong `exercise.text`.
2. Kiểm tra nội dung bằng `validateTypingContent(text, lessonCapabilities)`.
3. Nếu hợp lệ, dùng nguyên văn nội dung JSON.
4. Runtime fallback chỉ là lớp phòng vệ cho dữ liệu ngoài/phiên bản cũ. Nội dung sinh từ `newKeys`, `focusKeys`, `availableKeys`, loại exercise và word bank dùng chung.
5. Nội dung fallback được chạy lại qua cùng validator; generator ném lỗi nếu vi phạm invariant.
6. Seed gồm curriculum version, lesson, loại exercise và vị trí exercise nên cùng đầu vào luôn cho cùng kết quả.

Sau khi ghép, độ dài phiên được giới hạn theo tiến trình để tránh bài ký tự cơ bản quá dài: 180 ký tự cho bài 1–23, sau đó tăng dần 220/260/300/320 và tối đa 400 ký tự ở nhóm accuracy/speed. Việc cắt ưu tiên ranh giới token và kết quả cuối cùng được validator kiểm tra lại. `estimatedMinutes` là thời gian tối đa của phiên, không phải yêu cầu phải sinh đủ lượng chữ cho toàn bộ số phút đó.

Chữ hoa chỉ hợp lệ từ phase Shift (bài 121 trở đi) và chữ thường tương ứng phải có trong `availableKeys`. Ký hiệu Shift như `@`, `!`, `?` vẫn phải xuất hiện trực tiếp trong `availableKeys`; biết Shift và phím số tương ứng không tự động mở ký hiệu đó. Khoảng trắng/xuống dòng được validator xem là khả năng chung khi phù hợp, còn `Lesson.text` hiện chuẩn hóa xuống dòng thành khoảng trắng vì typing engine chỉ nhận phím ký tự và Backspace.

Capability Shift được chuẩn hóa từ phase `shift` trở đi, thay vì thêm chuỗi `"Shift"` dư thừa vào `availableKeys` của từng bài. `availableKeys` tiếp tục biểu diễn ký tự tạo ra, còn mapping bàn phím chịu trách nhiệm quy về phím vật lý.

Không thêm word list riêng cho từng bài. Muốn cải thiện nội dung thật, ưu tiên sửa exercise trong JSON. Chỉ mở rộng `WORD_BANK`/`SENTENCE_BANK` khi cần cải thiện nội dung fallback cho nhiều bài.

## Mô hình phím vật lý và ký tự tạo ra

`domain/keyboard.ts` là nguồn ánh xạ QWERTY dùng chung. Mỗi ký tự được chuyển thành `Keystroke` gồm phím vật lý và việc có cần Shift hay không:

```ts
type Keystroke = {
  key: string;
  code: string;
  shift: boolean;
}
```

Ví dụ `a → KeyA`, `A → Shift + KeyA`, `1 → Digit1`, `! → Shift + Digit1`, `; → Semicolon`, `: → Shift + Semicolon`. Validator kiểm tra riêng ba điều: phím vật lý đã mở, modifier đã mở, và ký tự tạo ra đã được curriculum cho phép. Nhờ đó không nhầm “có thể bấm trên bàn phím” với “đã được học trong lộ trình”.

## Validator và trạng thái dữ liệu

`validateCurriculum` kiểm tra:

- `lessonCount` khớp số phần tử;
- ID không trùng và đúng thứ tự;
- phase được tham chiếu tồn tại;
- accuracy nằm trong 0–100 và WPM dương hoặc `null`;
- `newKeys`/`focusKeys` thuộc `availableKeys`;
- exercise type được hỗ trợ;
- text tĩnh không dùng ký tự/phím vật lý/modifier chưa mở khóa.

Mọi lỗi cấu trúc hoặc nội dung tĩnh đều là blocking và dừng nạp curriculum trong development. Không hạ lỗi nội dung xuống warning chỉ vì runtime có fallback.

Lần chuẩn hóa này phát hiện 144/1.250 exercise nguồn không hợp lệ, chủ yếu do chữ hoa trước phase Shift và number drill dùng chữ số tương lai. Các exercise đó đã được sửa trực tiếp trong `curriculum.json` mà không mở rộng `availableKeys` để che lỗi. Kết quả hiện tại là 250/250 bài và 1.250/1.250 exercise hợp lệ. Báo cáo lịch sử được lưu tại `docs/curriculum-validation-report.md`.

Chạy validator độc lập:

```sh
npm run validate:curriculum
```

Lệnh trả mã lỗi nếu còn exercise không hợp lệ. Chế độ bảo trì `npm run validate:curriculum -- --fix` sinh nội dung thay thế xác định, ghi lại JSON và tạo báo cáo trước/sau; cần review nội dung sinh trước khi commit để bảo toàn chất lượng sư phạm.

## Typing engine và tiêu chí đạt

- Gõ sai không tiến ký tự; Backspace lùi một ký tự nhưng không xóa lịch sử lỗi.
- `WPM = số ký tự hoàn thành / 5 / số phút đang luyện`.
- `Accuracy = correctKeystrokes / keystrokes × 100`.
- Thời gian tạm dừng không tính; giới hạn phiên lấy từ `estimatedMinutes` của JSON.
- `target.wpm = null` là giá trị hợp lệ có chủ ý: WPM vẫn được đo/hiển thị nhưng không dùng để quyết định đạt bài.
- Chỉ khi `target.wpm` khác `null` mới bắt buộc đạt cả accuracy và WPM.
- Kết quả lưu `completedAt`, duration, characters, keystrokes, correct keystrokes, WPM, raw WPM, accuracy, passed và chi tiết lỗi. Attempt cũ chưa có `rawWpm` vẫn đọc được.

Bàn phím ảo dùng mapping tập trung trong `domain/keyboard.ts`. Với chữ hoa/ký hiệu, phím Shift được hướng dẫn ở tay đối diện: chữ tay trái dùng Shift phải và ngược lại.

Bài hướng dẫn “00” xuất hiện trực tiếp trong Lộ trình và có lối vào ở Góc hướng dẫn. Khi người mới mở bài 1 (`type: intro`) lần đầu, ba bước hướng dẫn trực quan sẽ xuất hiện trước phần gõ F/J. Sau khi hoàn tất, preference `introSeen` được lưu và intro không tự mở lại; người học vẫn có thể chủ động xem từ hai vị trí trên.

Hình được dựng bằng SVG/CSS từ `keyboardRowsFor` và mapping ownership, không phải ảnh bitmap. Bàn tay là silhouette liền khối, có móng/ngấn tay và đứng yên; tay trái/phải hoặc từng ngón được tô trực tiếp cùng màu với phím phụ trách. Các phím chức năng như Ctrl, Shift, Caps, Tab, Enter và Backspace cũng có ownership. Ký tự Shift được hiển thị thành hai tầng trên các phím số/dấu. Chỉ phần chuyển bước có hiệu ứng nhẹ và tự tắt theo `prefers-reduced-motion`.

`Preferences.keyboardPlatform` nhận `auto`, `mac`, `windows` hoặc `linux`. Chế độ auto đọc platform/user-agent của trình duyệt và fallback Windows khi không nhận ra. Lựa chọn này chỉ thay hình dạng/nhãn hàng modifier (`Command`, `Option`, `Win`, `Super`, `AltGr`…); phần chữ của curriculum vẫn dùng QWERTY. Platform hiệu lực được truyền vào bàn phím ảo và intro, đồng thời được lưu cùng preferences.

## Mở khóa và persistence

Trạng thái bài được suy ra từ attempts:

- `locked`: bài trước chưa đạt;
- `available`: đã mở nhưng chưa có attempt;
- `in progress`: đã có attempt nhưng chưa đạt;
- `completed`: có attempt `passed=true`.

Các bộ đếm tiến độ chỉ xét attempt có `lessonId` tồn tại trong curriculum hiện tại. Attempt cũ/orphan vẫn được giữ nguyên trong localStorage để không làm mất dữ liệu, nhưng không được cộng vào số “bài đạt mục tiêu”, lịch sử hay thống kê của lộ trình 250 bài.

Bài đã đạt luôn có thể luyện lại. Route chuẩn là `/practice/bai-N`; truy cập thẳng một bài khóa sẽ chuyển về bài đang được mở phù hợp.

UI không gọi trực tiếp `localStorage`. `createLocalServices()` lưu:

- `keylane.attempts.v1`: mọi attempt, idempotent theo `Attempt.id`;
- `keylane.preferences.v1`: âm thanh, hiển thị tay, WPM/CPM, kiểu bàn phím Mac/Windows/Linux và cờ `introSeen`.

Adapter đọc lại dữ liệu trước khi ghi, dùng Web Locks nếu trình duyệt hỗ trợ và lắng nghe `storage` để đồng bộ giữa tab. Dữ liệu hỏng không bị tự động ghi đè. Để thay backend, triển khai `AppServices` trong adapter mới rồi đổi composition root ở `src/main.tsx`.

Trong “Cài đặt bài luyện” có hai mức reset:

- “Đặt lại lượt đang tập” chỉ khởi tạo lại phiên hiện tại, không xóa lịch sử.
- “Xóa tiến độ bài này” gọi `ProgressService.resetLesson(lessonId)`, chỉ xóa attempts của đúng bài đang mở sau khi người dùng xác nhận. Các bài khác và preferences không bị ảnh hưởng.

Trong vùng gõ, Space hiện tại vẫn render bằng ký tự khoảng trắng thật; dấu chấm chỉ là lớp phủ CSS nên không làm thay đổi độ rộng và wrap của câu sau khi gõ. Viewport chỉ cuộn vừa đủ khi ký tự hiện tại đi ra ngoài vùng nhìn thấy, không căn giữa lại sau từng phím.

## Quy trình thay curriculum sau này

1. Thay `src/data/curriculum.json`, tăng `version` nếu nội dung sinh cần đổi seed.
2. Giữ ID ổn định nếu muốn attempt cũ tiếp tục gắn đúng bài. Runtime ID là `lesson-<id>`.
3. Nếu có exercise type mới, thêm enum ở `domain/types.ts`, whitelist/adapter ở `data/curriculum.ts`, rồi thêm chiến lược ở `domain/exercise.ts`.
4. Nếu thêm phím mới, cập nhật mapping `domain/keyboard.ts` trước khi đưa vào text.
5. Chạy `npm run validate:curriculum`; lỗi content phải được sửa trong JSON trước khi làm UI hoặc commit.
6. Với ký tự lỗi, ưu tiên sửa exercise. Chỉ đổi capability nếu bài đó thực sự có chủ đích giới thiệu phím/modifier tương ứng; không thêm hàng loạt ký tự vào `availableKeys`.
7. Chạy kiểm tra TypeScript tĩnh. Chỉ chạy build/test khi người dùng cho phép theo `AGENTS.md`.

## Hạn chế còn lại

- Repo chưa có test runner. Các hàm domain đã được tách thuần để bổ sung unit test cho WPM, accuracy, validator, generator, word eligibility, mapping Shift, mở khóa và storage khi được yêu cầu.
- Error tracking hiện lưu theo ký tự mong đợi/thực tế; chưa tổng hợp riêng bigram/trigram để adaptive practice.
- `durationSeconds` được bảo toàn trong model nhưng phiên hiện dùng tổng `estimatedMinutes`, chưa chạy timer riêng từng exercise.
- Dữ liệu tiến độ cũ của bộ 12 bài dùng lesson ID khác và không được tự động quy đổi sang curriculum 250 bài.

## Quyền riêng tư và phạm vi

Không có tài khoản, đồng bộ đám mây, đua nhiều người hoặc leaderboard thật. Font được đóng gói trong ứng dụng; dữ liệu học nằm trên thiết bị. Hai mục cộng đồng chỉ là màn hình “Sắp có”.
