package com.devcollab.backend.repository;

import com.devcollab.backend.entity.SavedMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedMessageRepository extends JpaRepository<SavedMessage, Long> {
    List<SavedMessage> findByUserIdOrderBySavedAtDesc(Long userId);
    Optional<SavedMessage> findByUserIdAndMessageId(Long userId, Long messageId);
}
