package com.devcollab.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    // Separate bucket maps for upload vs general API
    private final ConcurrentHashMap<String, Bucket> uploadBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> apiBuckets = new ConcurrentHashMap<>();

    private Bucket uploadBucketFor(String key) {
        return uploadBuckets.computeIfAbsent(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1))))
                        .build());
    }

    private Bucket apiBucketFor(String key) {
        return apiBuckets.computeIfAbsent(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(60, Refill.greedy(60, Duration.ofMinutes(1))))
                        .build());
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Only rate-limit POST/PUT/PATCH mutations
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) return true;

        String clientKey = getClientKey(request);

        Bucket bucket;
        if (path.startsWith("/api/upload/")) {
            bucket = uploadBucketFor("upload:" + clientKey);
        } else if (path.startsWith("/api/")) {
            bucket = apiBucketFor("api:" + clientKey);
        } else {
            return true;
        }

        if (bucket.tryConsume(1)) {
            response.addHeader("X-Rate-Limit-Remaining",
                    String.valueOf(bucket.getAvailableTokens()));
            return true;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.addHeader("Retry-After", "60");
        response.addHeader("Content-Type", "application/json");
        response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
        return false;
    }

    private String getClientKey(HttpServletRequest request) {
        // Prefer authenticated username, fall back to IP
        String username = request.getRemoteUser();
        if (username != null && !username.isBlank()) return username;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
