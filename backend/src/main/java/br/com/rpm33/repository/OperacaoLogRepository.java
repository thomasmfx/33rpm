package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.OperacaoLog;

public interface OperacaoLogRepository extends JpaRepository<OperacaoLog, Long> {

  Optional<OperacaoLog> findByDescricao(String descricao);
}
