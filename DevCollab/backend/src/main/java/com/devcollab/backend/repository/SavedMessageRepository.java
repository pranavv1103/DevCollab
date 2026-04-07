package com.devcollab.backend.repository;

import com.devcollab.backend.entity.SavedMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedMessageRepository extends JpaRepository<SavedMessage, Long> {
    @Query("SELECT sm FROM SavedMessage sm WHERE sm.user.id = :userId ORDER BY sm.savedAt DESC")
    List<SavedMessage> findByUserIdOrderBySavedAtDesc(@Param("userId") Long userId);

    @Query("SELECT sm FROM SavedMessage sm WHERE sm.user.id = :userId AND sm.message.id = :messageId")
    Optional<SavedMessage> findByUserIdAndMessageId(@Param("userId") Long userId, @Param("messageId") Long messageId);
}
