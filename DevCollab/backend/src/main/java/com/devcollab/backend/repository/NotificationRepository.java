package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC")
    List<Notification> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.read = false")
    List<Notification> findByUserIdAndReadFalse(@Param("userId") Long userId);
}
