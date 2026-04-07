package com.devcollab.backend.repository;

import com.devcollab.backend.entity.UserActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    @Query("SELECT ual FROM UserActivityLog ual WHERE ual.user.id = :userId ORDER BY ual.timestamp DESC")
    List<UserActivityLog> findByUserIdOrderByTimestampDesc(@Param("userId") Long userId);
}
