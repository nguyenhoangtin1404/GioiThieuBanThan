# Hướng Dẫn Test CI/CD

## Cách 1: Test thủ công từ GitHub UI (Khuyến nghị)

1. **Vào repository trên GitHub**
2. Click tab **Actions** ở trên cùng
3. Chọn workflow **"Auto Deploy to CPanel Hosting"** ở sidebar bên trái
4. Click nút **"Run workflow"** (góc trên bên phải)
5. Chọn nhánh (thường là `main`)
6. Click **"Run workflow"** để bắt đầu

Workflow sẽ chạy và bạn có thể xem logs real-time để kiểm tra từng bước.

## Cách 2: Test bằng cách push code

1. **Tạo một thay đổi nhỏ** (ví dụ: thêm comment vào file bất kỳ)
2. **Commit và push** lên nhánh `main`:
   ```bash
   git add .
   git commit -m "test: trigger CI/CD"
   git push origin main
   ```
3. **Vào tab Actions** trên GitHub để xem workflow đang chạy

## Cách 3: Test build local trước

Trước khi test trên GitHub, bạn có thể test build local:

```bash
# Cài đặt dependencies
npm ci

# Build project
npm run build

# Kiểm tra thư mục dist đã được tạo
ls -la dist/
```

Nếu build local thành công, CI/CD trên GitHub cũng sẽ thành công.

## Kiểm tra kết quả

### ✅ Workflow thành công nếu:
- Tất cả các bước (steps) có dấu ✓ màu xanh
- Bước "Build Astro project" hoàn thành
- Bước "Verify build output" hiển thị "Build output verified successfully"
- Bước "Deploy to cPanel using FTP" hoàn thành (nếu có cấu hình FTP secrets)

### ❌ Workflow thất bại nếu:
- Có bước nào có dấu ✗ màu đỏ
- Click vào bước đó để xem log lỗi chi tiết

## Lưu ý khi test

1. **FTP Secrets chưa cấu hình**: Nếu bạn chưa cấu hình FTP secrets, bước deploy sẽ thất bại. Điều này là bình thường - bạn vẫn có thể kiểm tra các bước build có hoạt động không.

2. **Test build only**: Để test chỉ phần build (không deploy), bạn có thể comment tạm bước deploy trong workflow file.

3. **Xem logs**: Click vào từng step để xem log chi tiết, rất hữu ích để debug.

## Troubleshooting

- **Lỗi "Unable to resolve action"**: Kiểm tra kết nối mạng hoặc version tag của action
- **Lỗi build**: Kiểm tra `package.json` và dependencies
- **Lỗi FTP**: Kiểm tra FTP secrets đã được cấu hình đúng chưa
