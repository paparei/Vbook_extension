# VBook Extensions Repository

Kho extension cho ứng dụng [vBook](https://vbook.app).

## Cài đặt vào vBook

1. Mở app **vBook**
2. Vào mục **Khám phá** / **Cài đặt tiện ích mở rộng**
3. Dán link nguồn sau:
```
https://raw.githubusercontent.com/paparei/Vbook_extension/main/plugin.json
```
4. Nhấn **Cài đặt** extension bạn muốn sử dụng.

## Danh sách Extensions

| Tên Extension | Loại | Nguồn | Phiên bản |
| ------------- | ---- | ----- | --------- |
| **MangaDex** | Comic | `https://mangadex.org` | v3 |
| **Anime47** | Video | `https://anime47.best` | v23 |
| **AnimeVsub** | Video | `https://animevsub.app` | v1 |
| **Anime Hay** | Video | `https://animevietsub.gg` | v2 |
| **BatCave** | Comic | `https://batcave.biz` | v2 |
| **Dilib Truyện Tranh** | Comic | `https://dilib.vn` | v2 |
| **Dilib Sách Nói & Radio** | Video (Audio) | `https://dilib.vn` | v2 |
| **OpenAI Compatible Translate** | Translate | `https://ai.lts.asia/v1` | v1 |

MangaDex mặc định ưu tiên chương tiếng Việt rồi tiếng Anh. Có thể đổi danh sách mã ngôn ngữ (phân tách bằng dấu phẩy, ví dụ `vi,en`) trong cài đặt extension.

Dilib Truyện Tranh hỗ trợ đọc Manga, Manhua, Manhwa, Webtoon và các thể loại truyện tranh. Dilib Sách Nói & Radio dùng loại `Video (Audio)` để phát MP3 bằng trình phát hiện tại của vBook.

## Anime47: tạo proxy riêng

Luồng VlogPhim cần Cloudflare Worker để phát ổn định. Mỗi người dùng tự tạo Worker miễn phí:

1. Mở **Cloudflare Dashboard → Workers & Pages → Create → Worker**.
2. Chọn **Edit code**, thay toàn bộ mã bằng [`anime47/proxy-worker.mjs`](anime47/proxy-worker.mjs), rồi **Deploy**.
3. Khuyến nghị: vào **Settings → Variables and Secrets**, thêm secret `PROXY_KEY` với một giá trị ngẫu nhiên dài. Không đăng giá trị này lên GitHub.
4. Sao chép URL `workers.dev`. Trong cài đặt extension Anime47 của vBook, nhập:
   - Không dùng secret: `https://ten-worker.tai-khoan.workers.dev/`
   - Có secret: `https://ten-worker.tai-khoan.workers.dev/?key=GIA_TRI_BI_MAT`
5. Bật thông báo mức sử dụng/giới hạn chi phí trong Cloudflare và chỉ chia sẻ URL nếu chấp nhận dùng chung hạn mức.

Worker chỉ cho phép máy chủ phát của VlogPhim, nhưng chủ tài khoản vẫn chịu trách nhiệm về lưu lượng và điều khoản sử dụng Cloudflare/nguồn video.

## Giấy phép

Phát hành theo giấy phép [MIT License](LICENSE).
