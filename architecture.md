
# FlexiNote Mobile Architecture (Flutter Focus)

## Neden Flutter?
Flexcil gibi bir uygulama için Flutter'ı seçmemizin temel nedeni **Skia/Impeller** grafik motorudur. Bu motor, doğrudan GPU ile konuşur ve saniyede 120 kare (FPS) çizim performansına olanak tanır.

## Katmanlı Mimari
1.  **Rendering Katmanı (CustomPainter):**
    - Çizim işlemleri `RepaintBoundary` içine alınmıştır. Bu sayede sadece çizim alanı değiştiğinde ekranın o kısmı tekrar boyanır (Dirty Region Rendering).
    - `Path` nesneleri bellek dostu olarak yönetilir.

2.  **State Management (Riverpod):**
    - Undo/Redo işlemleri için `Immutable` (değişmez) veri yapıları kullanılır. Her yeni çizgi, geçmişe bir "state" olarak eklenir.

3.  **AI Entegrasyonu:**
    - `Boundary.toImage()` yöntemiyle ekranın anlık görüntüsü vektörden bitmap'e dönüştürülür ve Gemini Multimodal API'ye gönderilir.

4.  **Veri Saklama:**
    - Vektör verileri JSON veya Protobuf formatında `Hive` (Hızlı NoSQL) veritabanında saklanır.

## Performans İpuçları
- **Isolates:** Büyük PDF dosyalarını işlerken veya karmaşık matematiksel hesaplamalar (çizgi düzeltme gibi) yaparken Dart'ın `Isolate` (Arka plan iş parçacığı) yapısı kullanılır. Bu sayede ana ekran (UI thread) asla donmaz.
