# VBook Extensions Repository

Kho extension cho ứng dụng [vBook](https://vbook.app).

## Cài đặt vào vBook

1. Mở app **vBook**.
2. Vào **Khám phá** / **Cài đặt tiện ích mở rộng**.
3. Dán link nguồn:
   ```text
   https://raw.githubusercontent.com/paparei/Vbook_extension/main/plugin.json
   ```
4. Chọn extension và nhấn **Cài đặt**.

## Danh sách extensions

| Tên | Loại | Nguồn | Phiên bản |
| --- | --- | --- | --- |
| **MangaDex** | Comic | `https://mangadex.org` | v6 |
| **Anime47** | Video | `https://anime47.best` | v28 |
| **AnimePahe** | Video | `https://animepahe.ch` | v8 |
| **PhimTV** | Video | `https://phimtv.cv` | v3 |
| **BatCave** | Comic | `https://batcave.biz` | v4 |

### AnimePahe v8

- Sửa lỗi phát MegaPlay: giữ ngữ cảnh giới thiệu từ AnimePahe và lấy luồng HLS để phát trực tiếp trong vBook.
- Đã kiểm tra tập 3 của **The Laid-Off Cheat-Granting Mage Enjoys a Second Lease on Life** trên Windows, có phụ đề tiếng Anh. Android/iOS chưa được xác minh.
- Làm mới danh sách tiện ích và cập nhật **AnimePahe lên v8**; ưu tiên máy chủ **HD 3 (MegaPlay)**. Blogger cũng đã phát được trên Windows; FlixCloud chưa được xác minh.

## Phát triển

Quy trình tạo, kiểm thử và phát hành extension nằm trong [`EXTENSION_WORKFLOW.md`](EXTENSION_WORKFLOW.md).

## Giấy phép

Phát hành theo [MIT License](LICENSE).
