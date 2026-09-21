package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Estado;

public interface EstadoRepository extends JpaRepository<Estado, Long> {

  Optional<Estado> findByDescIgnoreCase(String desc);
}
