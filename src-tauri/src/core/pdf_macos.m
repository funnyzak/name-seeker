#import <AppKit/AppKit.h>
#import <CoreText/CoreText.h>
#include <errno.h>
#include <unistd.h>

static void appendLine(NSMutableAttributedString *text, NSString *line, NSFont *font) {
    [text appendAttributedString:[[NSAttributedString alloc]
        initWithString:[line stringByAppendingString:@"\n"]
        attributes:@{NSFontAttributeName: font}]];
}

// Core Text picks fallback fonts per glyph and wraps long lines inside the page.
bool name_seeker_write_pdf(const unsigned char *bytes, size_t len, int fd) {
    @autoreleasepool {
        NSData *input = [NSData dataWithBytesNoCopy:(void *)bytes length:len freeWhenDone:NO];
        NSDictionary *report = [NSJSONSerialization JSONObjectWithData:input options:0 error:NULL];
        if (!report) return false;
        NSMutableAttributedString *text = [[NSMutableAttributedString alloc] init];
        NSFont *body = [NSFont systemFontOfSize:11];
        NSFont *bold = [NSFont boldSystemFontOfSize:12];
        appendLine(text, [NSString stringWithFormat:@"Search Results for: %@", report[@"username"]],
                   [NSFont boldSystemFontOfSize:18]);
        appendLine(text, [@"Generated: " stringByAppendingString:report[@"generated"]], body);
        NSArray *results = report[@"results"];
        appendLine(text, [NSString stringWithFormat:@"Total Results Found: %lu\n",
                          (unsigned long)results.count], bold);
        NSUInteger index = 0;
        for (NSDictionary *row in results) {
            appendLine(text, [NSString stringWithFormat:@"%lu. %@", (unsigned long)++index, row[@"site"]], bold);
            if ([row[@"url"] isKindOfClass:NSString.class])
                appendLine(text, [@"URL: " stringByAppendingString:row[@"url"]], body);
            if ([row[@"category"] isKindOfClass:NSString.class])
                appendLine(text, [@"Category: " stringByAppendingString:row[@"category"]], body);
            appendLine(text, @"", body);
        }

        CGRect page = CGRectMake(0, 0, 595, 842);
        NSMutableData *pdf = [NSMutableData data];
        CGDataConsumerRef consumer = CGDataConsumerCreateWithCFData((__bridge CFMutableDataRef)pdf);
        CGContextRef ctx = CGPDFContextCreate(consumer, &page, NULL);
        CGDataConsumerRelease(consumer);
        if (!ctx) return false;
        CTFramesetterRef layout = CTFramesetterCreateWithAttributedString((__bridge CFAttributedStringRef)text);
        CGPathRef area = CGPathCreateWithRect(CGRectInset(page, 52, 48), NULL);
        CFIndex offset = 0, length = (CFIndex)text.length;
        while (offset < length) {
            CTFrameRef frame = CTFramesetterCreateFrame(layout, CFRangeMake(offset, 0), area, NULL);
            CFIndex count = CTFrameGetVisibleStringRange(frame).length;
            if (count) {
                CGPDFContextBeginPage(ctx, NULL);
                CTFrameDraw(frame, ctx);
                CGPDFContextEndPage(ctx);
            }
            CFRelease(frame);
            if (!count) break;
            offset += count;
        }
        CGPathRelease(area);
        CFRelease(layout);
        CGPDFContextClose(ctx);
        CGContextRelease(ctx);
        if (offset != length) return false;
        const uint8_t *data = pdf.bytes;
        size_t remaining = pdf.length;
        while (remaining) {
            ssize_t n = write(fd, data, remaining);
            if (n < 0 && errno == EINTR) continue;
            if (n <= 0) return false;
            data += n;
            remaining -= (size_t)n;
        }
        return true;
    }
}
