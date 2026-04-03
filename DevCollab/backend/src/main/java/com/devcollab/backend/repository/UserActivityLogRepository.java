package com.devcollab.backend.repository;

import com.devcollab.backend.entity.UserActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    List<UserActivityLog> findByUserIdOrderByTimestampDesc(Long userId);
}
